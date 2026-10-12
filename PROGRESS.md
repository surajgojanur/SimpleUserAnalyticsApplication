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
7. Fresh clone: completed.

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


## Phase 7 completed
- Fresh clone followed the README alone, then fast-forwarded its documentation-only readiness correction to 4e3ff49. No copied dependencies, env files, or browser cache from original checkout.
- `npm ci` in API/dashboard/tracker/root/verification succeeded. `npm run seed -- --reset`: 30 sessions/358 events.
- Clone checks: `npm test` 39/39; `npm run lint`; `npm run format`; `npm run build`; live `curl /api/health`; `python3 verification/api-smoke.py`; `python3 verification/secrets.py` (8 commits/100 unique text blobs): passed. `git diff --exit-code` and status clean. Tracker build exactly matched committed asset.
- Downloaded full Chromium into clone's .cache with the exact README install command (`--no-shell`). Both clone-local browser scripts passed: tracker verified actual MongoDB/session/coordinates/storage/offline behavior; dashboard verified counts/rendered journey order, pagination, page switching, canvas pixel position, filters, responsive width, and loading/empty/error cases, with no unexpected browser errors. Clone screenshots are in ignored verification/fresh-clone/verification/artifacts.
- Stopped cloned servers; restarted original checkout API/dashboard/demo. All three returned HTTP 200 at 5000/api/health, 5173/, and 5174/. They are left running for review.

## Definition of done evidence
1. Single-tag page_view and click persistence: actual Chromium demo + MongoDB query assertions passed, including same session across pages and scroll y=2054.
2. Required API capabilities: curl smoke + real MongoDB Supertest suite passed; validation/rejection/duplicate codes verified.
3. Dashboard: actual Chromium sessions/counts/clickable ordered journey/canvas dots/page selection/device filtering passed; all loading/empty/error states exercised.
4. Tests/build/security: 39 tests, production build, lint, formatting, 0 audit vulnerabilities across all packages; history secret-pattern scan passed, env excluded.
5. README-only fresh checkout: installation, seed, all services, API checks, tests, build, both browser scripts executed successfully.
6. Deployment preparation: Render/Vercel configs and ordered Atlas/Render/Vercel manual steps documented. Hosted deployment is not executed.

## Remaining MANUAL STEPS / handoff
- Create public GitHub repository and push main; create Atlas cluster/user, Render service, and two Vercel projects; set actual environment variables; replace all demo tracker URLs; update allowed origins via seed; verify hosted flow in Chrome/Firefox; update README live links. No credentials/accounts or hosted results were invented.
- Local assumptions/limitations and guide corrections are fully documented in README. Requested model/reasoning setting could not be selected through session tools and is not claimed verified.
- All seven local phases are complete. Do not repeat implementation. For future work read README and git log. If processes are gone, start the three services using README; existing MongoDB on port 27017 was used. Ignored fresh-clone/cache/artifact directories retain verification evidence and are not submission source.

## Northwind store extension — active

The new extension request takes precedence over the earlier finished milestone. Read README, this progress history, all existing tests, and both browser verification scripts before implementation. Tracker and API runtime/contract are unchanged.

### Store/generator completed
- Generated 15 actual-path pages: home, shop, eight products, cart, checkout, confirmation, about, contact. Removed obsolete /products.html; regression selectors updated to real shop/search/newsletter/promo controls while preserving assertions.
- Northwind Goods uses local SVG art, one stylesheet, shared vanilla JS, a strict meta CSP, identical one-line tracker tags, and fixed readonly fictional form values. Cart uses integer cents, bounded quantities, validated options, and a separate localStorage key.
- `npm run build --prefix apps/demo-site`: 15 pages. Generator tests verified all pages and deployment URL/CSP rewriting; source files formatted, generated HTML excluded from formatter because generator output is the authoritative artifact.
- `node verification/store-browser.mjs` with project-local Chromium: desktop/mobile purchase paths stored 25/26 events with one session each; cart totals $258 → $387 → $258, DEMO10 total $232.20 persisted to checkout; confirmation cleared cart. All 15 pages rendered at desktop/mobile without overflow. Gallery/filter/sort/search/tab/FAQ, buy-now/remove/empty checkout, strict CSP/no offsite requests/no transmitted form data verified.
- First browser run found malformed cart JSON incorrectly reported as blocked storage. Split storage access errors from JSON/schema errors; rerun passed including the error-state assertion. Storefront screenshot captured and inspected.
- Store unit checks, lint, format, and whitespace checks passed after formatting package.json (first format attempt flagged that file).

### Remaining work / continuation
- Historical seed implementation and simulator are in progress. Seed test/run already passed but still needs its own commit/progress evidence. Simulator pilot initially stalled on Playwright keepalive lifecycle completion after navigation; fixed simulator forwarding/waits without changing the tracker; rerun is in progress.
- Finish simulator pilot and 40-session run; rerun existing browser scripts (stop API before tracker script), API/test/build/lint/format checks; capture dashboard screenshots in docs/screenshots; document flags/generator/seed semantics/deployment; verify a fresh clone; commit remaining steps.

### Historical funnel seed completed
- `npm run seed -- --reset` in apps/api: 30 historical sessions / 436 events inserted.
- Immediate `npm run seed`: 0 inserts. Stable site/origin/event UUIDs and $setOnInsert make repeat seeding idempotent; --reset still deletes only demo_store events before regeneration. Different primary origins use a separate seed ID namespace. Site allowed origins are updated every run.
- API unit suite expanded from 39 to 41 passing tests: all 15 real paths, 30→21→12→5→2 funnel, desktop/mobile clicks, valid event schema, stable IDs, past timestamps. No runtime API/model/tracker changes.
- Hotspots vary by page type and device; historical art/layout positions are approximate. Seed alone supplies past timestamps; simulator uses actual tracker timestamps.
- Live curl smoke adapted from exactly 3 pages to at least 15 actual page paths: passed all original endpoint/status/count/normalization checks.

### Simulator implementation verified and committed
- Five-session pilot (`--sessions 5 --seed 42 --concurrency 2`): 5 completed, buyer 3/researcher 2, 119 accepted events, no failed sessions or 429s, observed peak 110 requests/minute. Desktop/mobile physical click/tap paths were exercised.
- Initial pilot produced two timeout failures because Playwright navigation keepalive lifecycle callbacks did not settle. Simulator now rate-gates and explicitly forwards each original tracker request unchanged using Playwright routing (no generated payloads or altered timestamps), awaits the actual API response, and fulfills it back to the browser. Nothing changed in tracker or API runtime.
- All API forwarding forbids redirects; non-local targets and unrelated API paths are blocked. Global spacing is 350 ms (at most 172 requests/minute); 429 uses Retry-After with at least 60 s global pause and doubles spacing. Unit test uses a controlled clock to verify serialized pacing/backoff. Seeded choices are per-context reproducible; wall-clock timestamps and concurrent completion order intentionally are not.
- Existing tracker regression initially used an obsolete nav cart selector; updated to the actual bag link, rerun passed every original assertion, y=2800. Added an explicit stopPropagation handler in the check to retain capture-phase proof. Toasts no longer intercept clicks.
- Valid CLI flags, bounds, local-only URLs, seeded persona choices, rate-gate serialization/backoff tested. Browser launch/download stays project-local via PLAYWRIGHT_BROWSERS_PATH.

Next: full 40-session workload, dashboard screenshots/evidence, documentation and fresh clone. The original API is running again on 5000.

### Full simulator workload and dashboard verified
- `npm run simulate --prefix apps/demo-site -- --sessions 40 --seed 42` (default concurrency 3): all 40 visits completed; buyer 7, researcher 11, mobile 8, abandoner 8, bounce 6. Accepted/stored 667 events: 224 views + 443 clicks. Three intentional rotations yielded 43 tracker sessions. Zero failed sessions, zero 429s, observed peak 160/minute.
- Queried MongoDB by every reported session ID and all 43 API journeys: exact event counts, actual timestamps close to received_at, normalized URLs and bounded document coordinates passed. Event counts range 1–36. Committed compact evidence is docs/simulation-report.json; raw log is ignored verification/artifacts/simulation-40.log.
- Executed `--headed --base-url http://localhost:5174 --sessions 1 --concurrency 1 --seed 7`: one mobile bounce, one accepted event, no errors/429s; graphical Chromium actually launched.
- `node verification/shopper-dashboard.mjs`: 89 total sessions at capture, 15 page URLs, a 36-event/11-view journey matched API ordering/types/counts. Product heatmap had 80 clicks, both desktop/mobile, correct canvas pixel scaling and tall canvas; mobile dashboard width fit, no console/page errors. Screenshots sessions/journey/product-heatmap saved and visually inspected.
- Existing dashboard regression first failed a live-count comparison (18 vs 20) because purchase QA was simultaneously updating that session. Re-ran with no concurrent ingestion: passed every original loading/empty/error, pagination, journey and canvas assertion. This was verification scheduling, not a dashboard defect. No dashboard runtime changes were needed.

### Quality review: cart synchronization fix
- Reproduced an open checkout showing $129 and enabled Place order after another tab cleared its bag; header count correctly became zero but checkout summary stayed stale.
- Extracted renderCheckout and refresh both summary and enabled state on cart/promo/clear storage events; errors from invalid stored cart also remain visible. Added desktop/mobile two-tab browser regression for quantity $24→$48, discount $43.20, and empty/disabled checkout.
- Rerun `node verification/store-browser.mjs`: desktop/mobile purchases, cross-tab updates and empty state, all 15 pages, no offsite/form requests or console/page errors passed. Demo unit tests 5/5, root lint and format passed.
