# Shopping App Backend

This folder now contains a starter Go backend for the project.

## Structure

- `main.go` lets you start the backend with `go run .`.
- `cmd/server` keeps a secondary server entrypoint if you want it.
- `internal/app` contains shared server startup logic.
- `internal/config` loads runtime configuration.
- `internal/health` provides a simple health handler.
- `internal/httpapi` wires routes and middleware.

## Run

From `backend/`:

```powershell
go run .
```

The server listens on port `8080` by default.

To override the port:

```powershell
$env:PORT="9090"
go run .
```

## Verify

```powershell
go test ./...
go build .
go build ./cmd/server
```
