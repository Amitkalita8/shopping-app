package app

import (
	"context"
	"io"
	"log/slog"
	"testing"
	"time"
)

func TestWaitForDatabaseGivesUpAfterTheTimeout(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	started := time.Now()

	// Nothing listens on port 1, so every attempt is refused at once.
	err := waitForDatabase(context.Background(), "postgres://u:p@127.0.0.1:1/db?connect_timeout=1", 700*time.Millisecond, 200*time.Millisecond, logger)

	if err == nil {
		t.Fatal("expected an error when the database never becomes reachable")
	}
	if elapsed := time.Since(started); elapsed > 5*time.Second {
		t.Fatalf("waited %s, should stop near the 700ms timeout", elapsed)
	}
}

func TestWaitForDatabaseStopsWhenCancelled(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	ctx, cancel := context.WithTimeout(context.Background(), 300*time.Millisecond)
	defer cancel()

	err := waitForDatabase(ctx, "postgres://u:p@127.0.0.1:1/db?connect_timeout=1", time.Minute, 100*time.Millisecond, logger)

	if err == nil {
		t.Fatal("expected an error once the context is cancelled")
	}
}
