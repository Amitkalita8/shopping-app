// Package migrate applies the versioned SQL files in sql/ to the database, once each, in name order.
package migrate

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"log/slog"
	"strings"

	"github.com/jackc/pgx/v5"
)

//go:embed sql/*.sql
var files embed.FS

// lockID serialises migrations when several server instances start at the same time.
const lockID int64 = 7_273_440_101

// Up runs every migration that is not yet recorded in schema_migrations.
// Each file runs in its own transaction, so a failure leaves no half-applied changes.
func Up(ctx context.Context, databaseURL string, logger *slog.Logger) error {
	conn, err := pgx.Connect(ctx, databaseURL)
	if err != nil {
		return fmt.Errorf("connect for migrations: %w", err)
	}
	defer conn.Close(ctx)

	if _, err := conn.Exec(ctx, `SELECT pg_advisory_lock($1)`, lockID); err != nil {
		return fmt.Errorf("lock migrations: %w", err)
	}

	if _, err := conn.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	applied, err := appliedVersions(ctx, conn)
	if err != nil {
		return err
	}

	entries, err := fs.ReadDir(files, "sql")
	if err != nil {
		return fmt.Errorf("read migrations: %w", err)
	}

	for _, entry := range entries {
		version := strings.TrimSuffix(entry.Name(), ".sql")
		if applied[version] {
			continue
		}

		body, err := files.ReadFile("sql/" + entry.Name())
		if err != nil {
			return fmt.Errorf("read migration %s: %w", version, err)
		}

		if err := apply(ctx, conn, version, string(body)); err != nil {
			return err
		}

		logger.Info("applied database migration", "version", version)
	}

	return nil
}

func appliedVersions(ctx context.Context, conn *pgx.Conn) (map[string]bool, error) {
	rows, err := conn.Query(ctx, `SELECT version FROM schema_migrations`)
	if err != nil {
		return nil, fmt.Errorf("list applied migrations: %w", err)
	}
	defer rows.Close()

	applied := map[string]bool{}
	for rows.Next() {
		var version string
		if err := rows.Scan(&version); err != nil {
			return nil, fmt.Errorf("scan migration version: %w", err)
		}
		applied[version] = true
	}

	return applied, rows.Err()
}

func apply(ctx context.Context, conn *pgx.Conn, version, body string) error {
	tx, err := conn.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin migration %s: %w", version, err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, body); err != nil {
		return fmt.Errorf("run migration %s: %w", version, err)
	}

	if _, err := tx.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, version); err != nil {
		return fmt.Errorf("record migration %s: %w", version, err)
	}

	return tx.Commit(ctx)
}
