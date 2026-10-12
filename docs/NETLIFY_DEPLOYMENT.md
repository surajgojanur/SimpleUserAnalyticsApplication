# InsightFlow Netlify deployment

Two Netlify projects build independently from `main`. Set each project's **base directory and package directory** to its own application directory so Netlify discovers the corresponding `netlify.toml`. There is deliberately no shared root Netlify configuration.

| Setting                              | Store            | Dashboard        |
| ------------------------------------ | ---------------- | ---------------- |
| Base/package directory               | `apps/demo-site` | `apps/dashboard` |
| Build command                        | `npm run build`  | `npm run build`  |
| Publish directory (relative to base) | `dist`           | `dist`           |
| Node version                         | `22.23.1`        | `22.23.1`        |
| Public API build variable            | `DEMO_API_URL`   | `VITE_API_URL`   |

Set both public API variables to `https://insightflow-api-re52.onrender.com`, scoped to **Builds** and to every deploy context used by the project. A variable scoped only to Functions or to a different deploy context will not reach the build. MongoDB credentials belong only in the Render backend and ignored local API environment.

The store's old publish directory `.` must change to **`dist` before redeployment**. Checked-in HTML in the source directory is a local snapshot and is never published by the new pipeline. Each build clears `dist`, generates 15 pages, copies only CSS, store JavaScript and product JSON, then verifies tracker attributes, CSP, routes and the output file list. On Netlify, an absent, malformed, local, insecure or placeholder API origin stops the build.

In the store project, confirm `apps/demo-site/netlify.toml` is the loaded config in the deploy log. Its `build.processing.html.pretty_urls = false` preserves `/shop.html`, `/cart.html`, `/checkout.html`, `/order-confirmation.html` and `/products/*.html`. Confirm **Project configuration → Developer settings → Post processing → Pretty URLs** is disabled if the config is not being picked up. The dashboard's SPA redirect belongs only to the dashboard project.

After changing project settings, trigger **Clear cache and deploy site** on `main`. The store build log must report the public Render API origin and `Built and verified 15 Northwind pages in dist`. Check the published commit against `/build-info.json`: its `commit` comes from Netlify's `COMMIT_REF`, and its `apiOrigin` must be the Render origin. Compare that commit with `git rev-parse origin/main`. A successful Git push alone does not prove the hosted site published that commit.

## Render and Atlas

Render uses `apps/api`, `npm ci --omit=dev`, `npm start`, and `/api/health`; `render.yaml` specifies `main` and Node `22.23.1`. Set `NODE_ENV=production`, `TRUST_PROXY=1`, the secure Atlas `MONGODB_URI` targeting `insightflow`, and `DASHBOARD_ORIGIN` to the **exact actual dashboard origin**. Do not guess that origin. Restart/redeploy Render after changing it. Browser CORS is separate from store authorization in the Site document.

In the ignored local `apps/api/.env`, retain the Atlas URI and set:

```dotenv
DEMO_ORIGINS=https://insightflow-store.netlify.app,http://localhost:5174
```

From `apps/api`, run `npm run seed` **without `--reset`**. This updates `demo_store.allowed_origins` and inserts only missing deterministic seed IDs. IDs include the primary origin, so the first production-origin seed adds a separate set of 30 sessions; subsequent identical runs insert zero events. Existing local seed and real events are preserved.

The previously screenshot-exposed Atlas password must be rotated in Atlas, Render's `MONGODB_URI`, and ignored local credential/environment files. Never paste the password into frontend environment variables, deploy logs, screenshots, documentation or Git. Coordinate the rotation with the Render restart so the old password is no longer used.

## Verification

```bash
npm test
npm run lint
npm run format
npm run build
NETLIFY=true DEMO_API_URL=https://insightflow-api-re52.onrender.com npm run build --prefix apps/demo-site
NETLIFY=true VITE_API_URL=https://insightflow-api-re52.onrender.com npm run build --prefix apps/dashboard
curl -fsS https://insightflow-api-re52.onrender.com/api/health
curl -fsS https://insightflow-store.netlify.app/build-info.json
```

For local browser verification, build the store without `NETLIFY`/production environment flags and serve `apps/demo-site/dist` at port 5174. The existing browser scripts still use localhost for their local checks; use `CHROME_PATH` when running an installed browser rather than Playwright's downloaded Chromium. Load the API environment with `node --env-file=apps/api/.env` for browser scripts that read database records.

After publication, inspect live HTML and CSP, follow the complete shop/cart/fake-checkout journey, confirm `/api/events` responses are 202 (200 only for deduplicated retries), read those event IDs from Atlas, and open the actual dashboard to check their ordered journey and product heatmap. Verify direct navigation and refresh retain the `.html` URL. A 403 from ingestion means the Site's allowed origins must be checked; it is not fixed by relaxing CSP.
