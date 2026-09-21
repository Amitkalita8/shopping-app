# Shopping App

This repo is now split into two top-level folders:

- `frontend/` contains the React application.
- `backend/` is reserved for server-side code.

## Run The Frontend

From the repo root:

- `npm start`
- `npm run build`
- `npm test`

Those commands proxy into the React app inside `frontend/`.

You can also run the React app directly from `frontend/` with the same scripts.

## Deployment

Each branch deploys to its own address, so pushing `dev` never changes the live site.

| Branch | GitHub Pages | Vercel |
| --- | --- | --- |
| `master` (production) | https://amitkalita8.github.io/shopping-app/ | https://shopping-app-bay-five.vercel.app/ |
| `dev` | https://amitkalita8.github.io/shopping-app/dev/ | a Preview deployment, see below |

**GitHub Pages** is built by `.github/workflows/deploy.yml` on every push to `master` or `dev`.
`master` publishes to the site root and `dev` to the `dev/` folder of the `gh-pages` branch,
and neither deletes the other.

**Vercel** deploys `master` as Production and every other branch as a Preview. The `dev` address
is shown on the Vercel dashboard under Deployments, and on the commit's GitHub check. It stays the same
for every push to `dev`, in the form `shopping-app-git-dev-<your-vercel-team>.vercel.app`.
In Vercel, Settings > Git, the Production Branch must be `master`.

### Hosting the backend

The website reads all its data from the Go API in `backend/`, and the API needs a Postgres database.
Neither can run on GitHub Pages or Vercel, so they are hosted separately. `render.yaml` describes one
API per branch (`master` and `dev`), each with its own database, so dev testing never touches live data.
Both services use the free plans below, which is enough to start.

1. **Databases.** Create two Postgres databases, for example on [Neon](https://neon.tech) (one for
   production, one for dev). Copy each connection string. It ends with `?sslmode=require`.
2. **APIs.** In [Render](https://render.com) choose New > Blueprint and pick this repository. It reads
   `render.yaml`, creates `shopping-app-api` and `shopping-app-api-dev`, and asks for each `DATABASE_URL`.
   `AUTH_SECRET` is generated for you. On first start each API creates every table and loads the store
   content by itself, so there is nothing to import.
3. **Connect the websites.** Copy each API's address (like `https://shopping-app-api.onrender.com`)
   into the variables in the next section, then push or re-run the deploy so the sites rebuild.
4. **Check it.** Open `<api address>/health`, which should answer `ok`, and then the website.

The free Render plan puts an API to sleep when idle, so the first visit after a quiet period takes
up to a minute while the site shows "Loading the store...". A paid plan removes the wait.
Any host that runs Docker works too, using `backend/Dockerfile`.

**Admin panel.** The admin API only answers to a signed-in user whose role is `admin`. Nobody has that
role at first, so after signing in once on the store, promote yourself in the database (Neon's SQL editor
or pgAdmin):

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

Then sign in on the store and open `/admin`. Roles are checked on every request, so setting a
role back to `customer` locks that person out immediately. On GitHub Pages the admin address does not
work because of the `/shopping-app/` prefix, so use the Vercel site or localhost for the admin panel.

### Backend address for each environment

Set these once, separately for production and dev:

- **GitHub Pages:** repository Settings > Secrets and variables > Actions > Variables:
  `API_BASE_URL` (used by `master`), `API_BASE_URL_DEV` (used by `dev`) and `GOOGLE_CLIENT_ID`.
- **Vercel:** Settings > Environment Variables: `REACT_APP_API_BASE_URL` and `REACT_APP_GOOGLE_CLIENT_ID`,
  choosing Production for the live site and Preview for `dev`.

The backend's `FRONTEND_ORIGIN` accepts several addresses separated by commas, for example
`https://amitkalita8.github.io,https://shopping-app-bay-five.vercel.app`. GitHub Pages sends only the
site address, without `/shopping-app/`. Google sign-in also needs every frontend address listed under
Authorized JavaScript origins in Google Cloud Console.
