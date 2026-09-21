package app

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
)

const (
	databaseWaitTimeout = 60 * time.Second
	databaseRetryDelay  = 2 * time.Second
)

// waitForDatabase retries until the database accepts a connection. Hosted databases can be asleep or
// still starting when the server boots, and the server builds its stores once at startup, so
// without this a slow database would leave the API returning errors until someone restarted it.
func waitForDatabase(ctx context.Context, databaseURL string, timeout, retryDelay time.Duration, logger *slog.Logger) error {
	deadline := time.Now().Add(timeout)

	for attempt := 1; ; attempt++ {
		conn, err := pgx.Connect(ctx, databaseURL)
		if err == nil {
			return conn.Close(ctx)
		}

		if time.Now().Add(retryDelay).After(deadline) {
			return fmt.Errorf("database not reachable after %s: %w", timeout, err)
		}

		logger.Warn("database not reachable yet, retrying", "attempt", attempt, "error", err.Error())

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(retryDelay):
		}
	}
}
