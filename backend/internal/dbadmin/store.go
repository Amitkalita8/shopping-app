// Package dbadmin powers the read-only database browser at /db-admin.
// Every read runs in a read-only transaction, so nothing on the page can change data.
package dbadmin

import (
	"context"
	"database/sql/driver"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	// MaxPerPage caps how many rows one Browse page returns.
	MaxPerPage = 200
	// MaxQueryRows caps how many rows the SQL tab returns.
	MaxQueryRows = 500
	// queryTimeout stops a slow query from holding a connection.
	queryTimeout = "5s"
	// maskedValue replaces secrets such as password hashes.
	maskedValue = "••••••"
)

var ErrTableNotFound = errors.New("table not found")

type Store struct {
	pool *pgxpool.Pool
}

// NewStore opens a pool that connects on first use, so a database that is asleep at startup
// does not disable the page.
func NewStore(ctx context.Context, databaseURL string) (*Store, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("create pg pool: %w", err)
	}

	return &Store{pool: pool}, nil
}

type Table struct {
	Name string `json:"name"`
	Rows int64  `json:"rows"`
}

type Column struct {
	Name       string  `json:"name"`
	Type       string  `json:"type"`
	Nullable   bool    `json:"nullable"`
	Default    *string `json:"default"`
	PrimaryKey bool    `json:"primaryKey"`
	Masked     bool    `json:"masked"`
}

type BrowseOptions struct {
	Page    int
	PerPage int
	Sort    string
	Desc    bool
	Search  string
}

type BrowseResult struct {
	Table   string      `json:"table"`
	Columns []Column    `json:"columns"`
	Rows    [][]*string `json:"rows"`
	Total   int64       `json:"total"`
	Page    int         `json:"page"`
	PerPage int         `json:"perPage"`
	Sort    string      `json:"sort"`
	Desc    bool        `json:"desc"`
}

type QueryResult struct {
	Columns   []string    `json:"columns"`
	Rows      [][]*string `json:"rows"`
	Truncated bool        `json:"truncated"`
	Command   string      `json:"command"`
	ElapsedMS int64       `json:"elapsedMs"`
}

// readOnly runs fn in a read-only transaction with a statement timeout. The timeout is set with
// a SELECT, which also takes the transaction's snapshot, so a later statement cannot switch the
// transaction back to read-write.
func (s *Store) readOnly(ctx context.Context, fn func(pgx.Tx) error) error {
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{AccessMode: pgx.ReadOnly})
	if err != nil {
		return err
	}
	defer tx.Rollback(context.Background())

	if _, err := tx.Exec(ctx, `SELECT set_config('statement_timeout', $1, true)`, queryTimeout); err != nil {
		return err
	}

	return fn(tx)
}

// Tables lists the tables in the public schema with their exact row counts.
func (s *Store) Tables(ctx context.Context) ([]Table, error) {
	var tables []Table

	err := s.readOnly(ctx, func(tx pgx.Tx) error {
		rows, err := tx.Query(ctx, `
			SELECT table_name FROM information_schema.tables
			WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
			ORDER BY table_name`)
		if err != nil {
			return err
		}
		names, err := pgx.CollectRows(rows, pgx.RowTo[string])
		if err != nil {
			return err
		}

		for _, name := range names {
			var count int64
			if err := tx.QueryRow(ctx, `SELECT count(*) FROM `+tableIdent(name)).Scan(&count); err != nil {
				return fmt.Errorf("count %s: %w", name, err)
			}
			tables = append(tables, Table{Name: name, Rows: count})
		}
		return nil
	})

	return tables, err
}

// Columns describes a table. It returns ErrTableNotFound for names that are not tables in the
// public schema, which is also what keeps user input out of the SQL that Browse builds.
func (s *Store) Columns(ctx context.Context, table string) ([]Column, error) {
	var columns []Column
	err := s.readOnly(ctx, func(tx pgx.Tx) error {
		var err error
		columns, err = columnsOf(ctx, tx, table)
		return err
	})
	return columns, err
}

func columnsOf(ctx context.Context, tx pgx.Tx, table string) ([]Column, error) {
	rows, err := tx.Query(ctx, `
		SELECT c.column_name,
		       CASE WHEN c.data_type = 'USER-DEFINED' THEN c.udt_name ELSE c.data_type END,
		       c.is_nullable = 'YES',
		       c.column_default,
		       EXISTS (
		           SELECT 1
		           FROM information_schema.table_constraints tc
		           JOIN information_schema.key_column_usage k
		             ON k.constraint_name = tc.constraint_name
		            AND k.table_schema = tc.table_schema
		            AND k.table_name = tc.table_name
		           WHERE tc.constraint_type = 'PRIMARY KEY'
		             AND tc.table_schema = c.table_schema
		             AND tc.table_name = c.table_name
		             AND k.column_name = c.column_name)
		FROM information_schema.columns c
		JOIN information_schema.tables t
		  ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
		WHERE c.table_schema = 'public' AND c.table_name = $1
		ORDER BY c.ordinal_position`, table)
	if err != nil {
		return nil, err
	}

	columns, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (Column, error) {
		var c Column
		err := row.Scan(&c.Name, &c.Type, &c.Nullable, &c.Default, &c.PrimaryKey)
		c.Masked = isSecret(c.Name)
		return c, err
	})
	if err != nil {
		return nil, err
	}
	if len(columns) == 0 {
		return nil, ErrTableNotFound
	}

	return columns, nil
}

// Browse returns one page of a table, every value as text. Search matches any column.
func (s *Store) Browse(ctx context.Context, table string, opts BrowseOptions) (BrowseResult, error) {
	opts.PerPage = max(1, min(opts.PerPage, MaxPerPage))
	opts.Page = max(1, opts.Page)

	result := BrowseResult{Table: table, Page: opts.Page, PerPage: opts.PerPage, Desc: opts.Desc, Rows: [][]*string{}}

	err := s.readOnly(ctx, func(tx pgx.Tx) error {
		columns, err := columnsOf(ctx, tx, table)
		if err != nil {
			return err
		}
		result.Columns = columns

		// Only a real column name may be used for sorting; otherwise sort by the primary key.
		sort := ""
		for _, c := range columns {
			if c.Name == opts.Sort {
				sort = c.Name
			}
		}
		if sort == "" {
			sort = columns[0].Name
			for _, c := range columns {
				if c.PrimaryKey {
					sort = c.Name
					break
				}
			}
		}
		result.Sort = sort

		selects := make([]string, len(columns))
		for i, c := range columns {
			selects[i] = "t." + pgx.Identifier{c.Name}.Sanitize() + "::text"
		}

		from := " FROM " + tableIdent(table) + " AS t"
		args := []any{}
		if search := strings.TrimSpace(opts.Search); search != "" {
			from += " WHERE t::text ILIKE $1"
			args = append(args, "%"+escapeLike(search)+"%")
		}

		if err := tx.QueryRow(ctx, "SELECT count(*)"+from, args...).Scan(&result.Total); err != nil {
			return err
		}

		direction := "ASC"
		if opts.Desc {
			direction = "DESC"
		}
		query := "SELECT " + strings.Join(selects, ", ") + from +
			" ORDER BY t." + pgx.Identifier{sort}.Sanitize() + " " + direction + " NULLS LAST" +
			fmt.Sprintf(" LIMIT %d OFFSET %d", opts.PerPage, (opts.Page-1)*opts.PerPage)

		rows, err := tx.Query(ctx, query, args...)
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			values := make([]*string, len(columns))
			targets := make([]any, len(columns))
			for i := range values {
				targets[i] = &values[i]
			}
			if err := rows.Scan(targets...); err != nil {
				return err
			}
			for i, c := range columns {
				if c.Masked && values[i] != nil {
					masked := maskedValue
					values[i] = &masked
				}
			}
			result.Rows = append(result.Rows, values)
		}
		return rows.Err()
	})

	return result, err
}

// Query runs one SQL statement read-only and returns at most MaxQueryRows rows. The extended
// protocol rejects several statements in one call, so "COMMIT; DELETE ..." cannot escape the
// read-only transaction.
func (s *Store) Query(ctx context.Context, sql string) (QueryResult, error) {
	result := QueryResult{Columns: []string{}, Rows: [][]*string{}}
	started := time.Now()

	err := s.readOnly(ctx, func(tx pgx.Tx) error {
		rows, err := tx.Query(ctx, sql, pgx.QueryExecModeDescribeExec)
		if err != nil {
			return err
		}
		defer rows.Close()

		fields := rows.FieldDescriptions()
		masked := make([]bool, len(fields))
		for i, f := range fields {
			result.Columns = append(result.Columns, f.Name)
			masked[i] = isSecret(f.Name)
		}

		for rows.Next() {
			if len(result.Rows) == MaxQueryRows {
				result.Truncated = true
				break
			}
			values, err := rows.Values()
			if err != nil {
				return err
			}
			row := make([]*string, len(values))
			for i, v := range values {
				row[i] = toText(v)
				if masked[i] && row[i] != nil {
					m := maskedValue
					row[i] = &m
				}
			}
			result.Rows = append(result.Rows, row)
		}
		if err := rows.Err(); err != nil {
			return err
		}
		result.Command = rows.CommandTag().String()
		return nil
	})

	result.ElapsedMS = time.Since(started).Milliseconds()
	return result, err
}

func tableIdent(name string) string {
	return pgx.Identifier{"public", name}.Sanitize()
}

// isSecret reports whether a column holds a secret that the page must not show.
func isSecret(column string) bool {
	name := strings.ToLower(column)
	for _, word := range []string{"password", "secret", "token", "hash", "otp"} {
		if strings.Contains(name, word) {
			return true
		}
	}
	return false
}

func escapeLike(s string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(s)
}

// toText renders a value from the SQL tab the way psql would show it.
func toText(v any) *string {
	var s string
	switch v := v.(type) {
	case nil:
		return nil
	case string:
		s = v
	case []byte:
		s = `\x` + hex.EncodeToString(v)
	case time.Time:
		s = v.Format(time.RFC3339)
	case [16]byte:
		s = fmt.Sprintf("%x-%x-%x-%x-%x", v[0:4], v[4:6], v[6:8], v[8:10], v[10:16])
	case fmt.Stringer:
		s = v.String()
	case map[string]any, []any:
		b, _ := json.Marshal(v)
		s = string(b)
	default:
		// pgtype values such as Numeric and Interval render themselves as text this way.
		if valuer, ok := v.(driver.Valuer); ok {
			if inner, err := valuer.Value(); err == nil {
				return toText(inner)
			}
		}
		s = fmt.Sprint(v)
	}
	return &s
}
