# Shopping App Backend

This folder now contains a starter Go backend for the project.

## Structure

- `main.go` lets you start the backend with `go run .`.
- `cmd/server` keeps a secondary server entrypoint if you want it.
- `internal/app` contains shared server startup logic.
- `internal/config` loads runtime configuration.
- `internal/health` provides a simple health handler.
- `internal/httpapi` wires routes and middleware.
- `internal/auth` handles register, login and Google login.
- `internal/storefront` serves the public shop data (products, categories, home page, policies) from the database.
- `internal/migrate` applies the versioned SQL in `internal/migrate/sql/` on startup.

## Storefront API

The shop website renders entirely from these read-only endpoints, backed by the database:

- `GET /api/v1/storefront` returns everything the site needs in one response: settings, hero and navigation content, the category menu, collections, products, home page sections and policies.
- `GET /api/v1/categories` returns the category tree.
- `GET /api/v1/products` lists active products. Add `?collection=traditional/sarees` to list one collection.
- `GET /api/v1/products/{slug}` returns one product, or 404.

Content is edited through the admin panel (`/api/v1/admin/bootstrap`) or directly in the tables.
Product images are stored as file names, such as `banarasi-saree-real.png`, that the frontend maps to its bundled assets, or as full URLs.

## Database migrations

When `DATABASE_URL` is set, the server applies any new `internal/migrate/sql/NNN_name.sql`
files on startup, in order, each in its own transaction, and records them in `schema_migrations`.
To change the schema, add the next numbered file. Never edit one that has already been applied.

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
