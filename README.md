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

### Backend address for each environment

The website reads all its data from the backend API, so each deployed frontend needs the address of a
running backend. Set these once, separately for production and dev:

- **GitHub Pages:** repository Settings > Secrets and variables > Actions > Variables:
  `API_BASE_URL` (used by `master`), `API_BASE_URL_DEV` (used by `dev`) and `GOOGLE_CLIENT_ID`.
- **Vercel:** Settings > Environment Variables: `REACT_APP_API_BASE_URL` and `REACT_APP_GOOGLE_CLIENT_ID`,
  choosing Production for the live site and Preview for `dev`.

The backend's `FRONTEND_ORIGIN` accepts several addresses separated by commas, for example
`https://amitkalita8.github.io,https://shopping-app-bay-five.vercel.app`. GitHub Pages sends only the
site address, without `/shopping-app/`. Google sign-in also needs every frontend address listed under
Authorized JavaScript origins in Google Cloud Console.
