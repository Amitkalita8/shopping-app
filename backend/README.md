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

## Settings

The server reads these environment variables. Locally it also reads a `backend/.env` file, which is
never committed; on a host, set them in its dashboard.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. Without it the API starts but data endpoints answer 503. |
| `AUTH_SECRET` | Signs login sessions. Set a long random value in production. |
| `GOOGLE_CLIENT_ID` | Enables Google sign-in. |
| `FRONTEND_ORIGIN` | Websites allowed to call the API, comma separated, for example `https://amitkalita8.github.io,https://shopping-app-bay-five.vercel.app`. |
| `PORT` | Port to listen on (default `8080`). Hosts set this themselves. |

At startup the server waits for the database (up to a minute, since hosted databases can be asleep),
then applies any new migrations. It stays up even if the database never appears.

The `docker build` context is this folder: `docker build -t shopping-api .` then
`docker run -p 8080:8080 -e DATABASE_URL=... shopping-api`.

## Storefront API

The shop website renders entirely from these read-only endpoints, backed by the database:

- `GET /api/v1/storefront` returns everything the site needs in one response: settings, hero and navigation content, the category menu, collections, products, home page sections and policies.
- `GET /api/v1/categories` returns the category tree.
- `GET /api/v1/products` lists active products. Add `?collection=traditional/sarees` to list one collection.
- `GET /api/v1/products/{slug}` returns one product, or 404.

Content is edited through the admin panel or directly in the tables. The admin endpoint,
`/api/v1/admin/bootstrap`, requires a signed-in user whose `users.role` is `admin`; anyone else gets 401 or 403.
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
