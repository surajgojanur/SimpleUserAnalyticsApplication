# InsightFlow Analytics progress

The complete 34-page PDF in docs was read before writing code. The assignment wins over the guide. Work is sequential; all verification results below must come from execution.

## Execution context
- Node v22.23.1, npm 10.9.8, Fedora with Podman.
- Model selection cannot be changed through this session's tools; GPT-6.1 Sol / Medium was requested but cannot be asserted.
- All project artifacts, npm caches, browser downloads, and fresh-clone verification stay inside this project. MongoDB runs in the explicitly requested Podman container.
- Original guide retained, with extracted text for review.

## Phase status
1. Backend: completed.
2. Tracker/demo: completed.
3. Dashboard: completed.
4. Tests: completed.
5. Quality: completed.
6. Documentation/deployment preparation: completed.
7. Fresh clone: in progress.

## Continuation
Read this file and git log first. Run only checks appropriate to the current phase; do not repeat completed implementation. Local ignored .env files use synthetic/local settings. Deployment and public GitHub publication require human accounts and credentials and will be documented as MANUAL STEPS.

## Phase 1 completed
- `npm run seed -- --reset`: 30 synthetic sessions, 310 events.
- `npm start`: API listening on port 5000; existing MongoDB on 27017 successfully connected. Requested Podman startup failed with address in use; used the existing instance as permitted.
- `python3 verification/api-smoke.py`: curl verified health, ingestion 202, duplicate 200, invalid 400, unknown site 404, forbidden Origin 403, five-session pagination/counts, normalized session event, sites, three pages, populated heatmap.
- Added initialization of unique index before serving traffic, deterministic aggregation tie ordering, HTTP(S) URL normalization at ingestion, and configurable proxy trust (local 0, Render 1).
- npm audit detected development dependency advisories; resolve during quality phase before final verification.

Next: phase 2 tracker/demo. API process currently running; local MongoDB is available. No external credentials needed for local work.

## Phase 2 completed
- `npm run build --prefix packages/tracker`: esbuild generated 1.6 KB bundle, committed at apps/api/public/tracker.js.
- Demo served using `python3 -m http.server 5174 --directory apps/demo-site`.
- Installed Playwright locally and Chromium inside .cache/browsers. First browser attempt preceded completion of the headless-shell download and failed; switched to the already downloaded full Chromium channel and reran successfully.
- `PLAYWRIGHT_BROWSERS_PATH=$PWD/.cache/browsers node verification/tracker-browser.mjs`: PASS. Queried actual MongoDB events: page views and capture-phase clicks, same session through home/products/cart and reload, normalized URLs, scrolled click y=2054, 31-minute timestamp edit rotates session, blocked storage keeps an in-memory session.
- Browser script actually stopped its API process, clicked a working host button, and confirmed no page errors. Network failure messages are browser diagnostics, not uncaught host exceptions.
- Guide fixes: all future tracker callbacks guarded individually; corrupt stored session data rejected; demo bottom button placed at the bottom. Optional SPA history monkey patch omitted to keep assignment scope small; full navigation supported.

Next: phase 3 dashboard. Demo server remains on 5174. API verification script shuts down its own server; start API again for dashboard checks.

## Phase 3 completed
- `npm run build --prefix apps/dashboard`: Vite production build passed (36 modules).
- `npm run dev` in apps/dashboard serves 5173; API on 5000 and demo on 5174.
- `PLAYWRIGHT_BROWSERS_PATH=$PWD/.cache/browsers node verification/dashboard-browser.mjs`: PASS. Live counts matched API, journey length/order checked, pagination worked, canvas red pixel verified at a click's scaled coordinates, desktop/mobile filters matched exact API counts, mobile viewport had no horizontal overflow.
- Browser interception verified loading, empty, and error states for sites, sessions, journey, pages, and click data. No unexpected page or console errors; deliberately injected 503 diagnostics excluded.
- Screenshots saved under ignored verification/artifacts; both inspected visually.
- Guide fixes: aborted stale requests and cleared old data during loading, keyboard-accessible session buttons, explicit page loading state, documented 5000 cap. Tailwind used with minimal project CSS; no scaffold assets.

Next: phase 4 API integration/validator tests, against a separate _test database.

## Phase 4 completed
- `npm test --prefix apps/api`: 39 tests passed (24 Supertest/integration, 15 validator).
- First run: 37 passed, 2 failed. Malformed URL refinement threw TypeError and caused HTTP 500. Guarded URL parsing in refinement and reran: 39/39 passed.
- Coverage includes actual MongoDB writes, concurrent and sequential duplicate IDs, missing click data, unknown site, Origin rejection, five-minute future limit, malformed JSON/URL, 10kb limit, 429 rate limit, CORS, exact grouped counts/pagination/site isolation, timestamp/_id ordering, pages, 5001-click cap/latest ordering, empty states, tracker CORP.
- Tests require a database ending in _test distinct from MONGODB_URI, clean it between cases, and drop only that database on completion.

Next: phase 5 quality review, dependency advisories, lint, and secret/history checks.

## Phase 5 completed
- Re-read implementation and verification code; formatted source consistently. Fixed seed loop to sample click count once per page, rejected non-HTTP(S) seed origins, and retained Express's four-argument error-handler signature.
- Removed nodemon in favor of Node --watch; updated Vitest to 4.1.11 and explicitly selected Vite 6 for Node 20 compatibility. npm 10 crashed repeatedly with `Cannot read properties of null (reading edgesOut)` while resolving optional Vitest devtools peers, including a clean install. apps/api/.npmrc uses legacy-peer-deps; a fresh install then succeeded. Required versions are locked and verified. Install API from its directory so project npm settings apply.
- `npm test`: 39/39 pass using updated Vitest.
- `npm run lint`, `npm run format`, `npm run build`, `git diff --check`: passed. Root scripts are convenience wrappers, not workspaces.
- Full `npm audit` in root, API, dashboard, tracker, verification: all reported 0 vulnerabilities.
- `python3 verification/secrets.py`: scanned 5 commits/55 unique text blobs with no recognized secrets or tracked .env/node_modules. Pattern scan is limited to known token/private-key/credential URL formats; .env files checked excluded. Source review found no credentials.
- No TODO/FIXME/template asset references. Built tracker regenerated without changing its committed bytes.
- `npm run seed -- --reset`: 30 sessions/393 events; invalid FTP seed origin exits 1 before DB access.
- Strengthened browser verification checks exact event-count cell, rendered timestamps/types, alternate page URL selection, and rejects all unexpected console errors. Rerun after seed/formatting: passed.

Next: phase 6 README and deployment notes, followed by a real fresh clone inside verification/fresh-clone (ignored).

## Phase 6 completed
- README includes full setup, independent packages, env variables, rebuild/embed, endpoint examples/errors/ordering/limits, data models/index rationale, tests/browser QA, assumptions, manual checklist, known limitations, future work, troubleshooting, and guide corrections.
- Deployment order follows guide: public GitHub → Atlas → production seed → Render → Vercel dashboard → Vercel demo → connect origins → hosted verification. All account/credential/publication/hosting work clearly marked MANUAL STEPS; no hosted claims.
- render.yaml prepared with apps/api root, npm ci --omit=dev, npm start, health route, Node 20, production, proxy trust, and manual environment inputs. README also states guide's npm install command. Vercel config preserves demo .html paths.
- Parsed both Vercel JSON files, checked README coverage, lint and diff whitespace checks passed. Provider deployments are not executed and cannot be claimed validated.

Next: phase 7 fresh clone into verification/fresh-clone. Stop original service processes to avoid port collisions. Follow README commands only, using existing local MongoDB; install all packages with npm ci from their own directories, seed, run services, smoke/tests/build/lint, tracker/browser QA. Record actual results and fixes.


## Phase 7 intermediate evidence
- Fresh clone at 0c76874 under verification/fresh-clone, independent node_modules/cache/env copies; installed only using README commands. Existing MongoDB used as documented.
- npm ci succeeded in all five package directories (root/API/dashboard/tracker/verification); seeded 30 sessions / 358 events.
- In clone: npm test 39/39, lint, format, tracker/dashboard build, secret scan (7 commits/98 text blobs), clean Git diff all passed. Bundle rebuild produced no changes.
- Started cloned API via npm run dev, cloned dashboard on 5173, cloned demo on 5174. First immediate curl attempt raced startup and failed to connect. After API listening message, all curl smoke assertions passed. README now explicitly says to wait for server readiness.
- Browser download into clone-local .cache is in progress; tracker and dashboard browser verification still required before marking phase 7 complete.
