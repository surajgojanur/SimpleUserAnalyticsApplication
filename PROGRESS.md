# InsightFlow Analytics progress

The complete 34-page PDF in docs was read before writing code. The assignment wins over the guide. Work is sequential; all verification results below must come from execution.

## Execution context
- Node v22.23.1, npm 10.9.8, Fedora with Podman.
- Model selection cannot be changed through this session's tools; GPT-6.1 Sol / Medium was requested but cannot be asserted.
- All project artifacts, npm caches, browser downloads, and fresh-clone verification stay inside this project. MongoDB runs in the explicitly requested Podman container.
- Original guide retained, with extracted text for review.

## Phase status
1. Backend: in progress.
2. Tracker/demo: pending.
3. Dashboard: pending.
4. Tests: pending.
5. Quality: pending.
6. Documentation/deployment preparation: pending.
7. Fresh clone: pending.

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
