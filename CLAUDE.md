# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

DjCoordinationApp ("kremer Music", package name `dj-pool-demo`) is a full-stack DJ coordination platform for wedding/event clients: couples log in with a code, complete a preferences wizard, browse and rate a music catalog, and sign digital contracts. The DJ runs everything from an admin panel.

**`docs/PROJECT.md` is the full technical reference** — API reference, contract field-model schema, complete environment-variable table, data file shapes. This file is a shorter map of the architecture and the non-obvious parts; read `docs/PROJECT.md` for exhaustive detail, and update both if you change the architecture.

## Commands

```bash
npm install
cp .env.example .env    # app works locally without ADMIN_SECRET (see auth below)
npm run dev              # Vite dev server + API middleware — http://localhost:5173
npm run build             # vite build, then generates storage-bootstrap/ for first Render boot
npm start                  # production server (node server.js) — run `npm run build` first
npm run preview             # preview the production build, with API middleware attached
npm run lint                 # ESLint (flat config, eslint.config.js)
```

There is **no automated test suite** in this repo — no test runner is configured and there are no `*.test.*`/`*.spec.*` files. Don't assume `npm test` exists.

Other `package.json` scripts: `scan-music` / `fetch-artwork` (standalone Python helpers under `public/`, not wired into the Node app — see below), `compute-rgb-waveform` (precompute waveform data), `restore-backup` (restore an admin backup archive), `deploy` (build + commit + push straight to `main` — see "Deploy" below before running it).

## Architecture

### One set of handlers, two hosts

There's no framework (no Express) and no database — persistence is JSON files on disk plus uploaded media. The request handlers in `server/*.js` are each exported as a middleware factory (`createAuthApiMiddleware`, `createContractApiMiddleware`, `createDataApiMiddleware`, etc.) and wired into **two different hosts** that must be kept in sync by hand:

- **Dev/preview** — `vite.config.js` mounts them as Vite middleware inside `configureServer`/`configurePreviewServer`.
- **Production** — `server.js` chains the same factories in a plain `http.createServer`, then falls through to serving `dist/` (with SPA fallback to `index.html`).

Adding a new API module means wiring it into *both* files, in a sane position relative to `apiNotFound`/`mediaAuth`/static serving. There's no auto-discovery.

Frontend entry chain: `src/main.jsx` (applies stored theme/accessibility/design prefs before React mounts, to avoid a flash of default styling) → `src/App.jsx` (wraps in `AppSettingsProvider` for i18n) → `src/DJPoolDemo.jsx` — a ~1400-line app shell that owns routing and orchestrates nearly every domain hook. Expect to read this file when tracing how a screen gets its data or how admin/client areas switch.

### Storage root resolution & first-boot seeding

`server/storagePaths.js` resolves `STORAGE_ROOT` in order: `$STORAGE_ROOT` env var → `/var/data` if `$RENDER` is set and that path exists → `public/` locally. `MUSIC_ROOT` and `DATA_DIR` are derived from it. This is why local dev reads/writes `public/data/*.json` and `public/music/` directly, while production reads/writes the Render persistent disk — same code path, different root.

`npm run build` runs `scripts/prepare-storage-bootstrap.mjs`, which writes an **empty** catalog/clients/feedback plus default form-schema/app-settings into `storage-bootstrap/`. On boot, `initStorage()` seeds `STORAGE_ROOT` from `storage-bootstrap/` only when `data/catalog.json` doesn't already exist there — so it never overwrites an existing Render disk, and it deliberately does **not** copy your local dev catalog into production. A fresh production deploy starts empty; the DJ populates it for real through the admin UI or Dropbox import.

### Data & auth

- `server/dataStore.js` is the CRUD layer for `clients.json`, `feedback.json`, `catalog.json`, `form-schema.json`, `app-settings.json`. Writes are atomic: write to `<file>.tmp`, then `fs.rename`. Follow this pattern for any new JSON-backed resource.
- `server/auth.js` implements HMAC-signed, `HttpOnly` cookie sessions (`km_session`, 7-day expiry, `timingSafeEqual` comparison). `isAuthEnforced()` is `false` in dev when `NODE_ENV !== "production"` and `ADMIN_SECRET` is unset — in that mode `parseRequestSession()` silently returns a synthetic admin session (`{ role: "admin", bypass: true }`) for every request. Auth checks will appear to pass locally with no login; that's intentional and only bypassed in dev.
- `assertProductionSecrets()` (called at prod startup in `server.js`) hard-exits the process if `ADMIN_SECRET` is missing when `NODE_ENV === "production"`.
- Any handler that builds a filesystem path from user/URL input must go through `server/pathSafety.js` (`safePathUnderRoot` / `isUnderRoot`) — see its use in `server.js` static serving and in `uploadMusic.js` / `storageBrowseApi.js`.

### Frontend state

No Redux/Zustand. Server-synced state lives in domain hooks under `src/hooks/` (`useClients`, `useContracts`, `useTrackFeedback`, `useFormSchema`, `useGenres`, `useAppRouter`), each backed by thin fetch wrappers in `src/lib/api/*.js` that always send `credentials: "include"`. Routing is a custom History-API router (`useAppRouter` + `src/lib/appRoutes.js`), not React Router.

`src/lib/` is largely framework-agnostic on purpose: modules like `contractFields.js`, `trackVersions.js`, and `categories.js` are imported directly by `server/*.js` so validation/business logic isn't duplicated between client and server. Before changing one of these, check whether a `server/` module imports it too.

`localStorage` today holds only local UI/device preferences (theme, accessibility, locale, waveform/browser row style — `src/lib/themes.js`, `accessibility.js`, `i18n/translations.js`, `browserRowSize.js`) plus a cached Dropbox OAuth token. It is **not** the data store. `src/lib/migrateLocalStorage.js` is a one-time migration out of an older, pre-server version of this app that kept everything in `localStorage`. `project-status.md` at the repo root documents that older architecture and is stale/superseded — prefer `docs/PROJECT.md` and the code.

i18n: Hebrew (`he`, RTL) is the default locale, English (`en`, LTR) is secondary — see `DEFAULT_APP_SETTINGS.defaultLocale` and `localeDir()` in `src/lib/i18n/translations.js`. Use `useI18n()` (`t`, `dir`, `locale`) rather than hardcoding UI strings; admins can also override site text at runtime from the Copy tab (`AdminTextEditor`).

### Contracts subsystem (cross-cutting)

Templates (PDF/DOCX with positioned fields) → tickets (one canonical ticket per client) → optional public share link (`signToken`, served at `/c/:token`). A field can declare `syncFrom` (e.g. `clientName`, `eventDate`) to auto-fill from the client record when a ticket is created; that logic is `buildTicketValuesWithClientDetails()` in `src/lib/contractFields.js`, sourced from `src/lib/clientDetails.js`. After signing, `server/contractSignedCopy.js` stamps field values and the signature onto the PDF (Hebrew + ASCII fonts from `server/fonts/`) and writes `data/contracts/signed/{ticketId}.pdf`. Adding a new syncable client attribute touches `clientDetails.js`, `contractFields.js`, and `buildClientDetailsSnapshot()` — the template editor's dropdown picks it up automatically (see `docs/PROJECT.md`'s "Add a contract sync source" recipe for the exact list).

### Music catalog

Tracks live in `catalog.json`; each track can have multiple `versions` (`src/lib/trackVersions.js`), with files under `music/{genre}/analyzed/`. `POST /api/music/verify` checks files exist on disk and sets `isMissing`; missing tracks are hidden from clients and flagged red for admins. `public/scan_music.py` (+ `analyzer.py`, using `librosa` for drop detection) is a **separate, older ingestion path** that writes `catalog.json` directly using hardcoded `public/...` paths — it is not `STORAGE_ROOT`-aware and isn't wired into the Node upload flow (`server/uploadMusic.js`, `server/transcodeAudio.js`) that the admin UI actually uses. Treat it as a local-only bulk-import convenience, not part of the production pipeline.

## Conventions & gotchas

- **Runtime data files are git-tracked despite `.gitignore`.** `public/data/{catalog,clients,feedback,form-schema}.json` were committed before being added to `.gitignore`, so `git status` / `git add -A` can still pick up local edits to them. `npm run deploy` explicitly unstages everything in `scripts/runtimeDataPaths.js`'s `DEPLOY_EXCLUDE_PATHS` before committing. If you commit by hand, do the same (`git reset HEAD -- <path>`) or you risk pushing local catalog/client data over production's.
- **`npm run deploy` pushes straight to `main`**, and Render (`render.yaml`, `autoDeploy: true`) deploys from `main` on push. There's no CI (no `.github/` directory) and no PR gate — a push to `main` is a production deploy.
- ESLint (`eslint.config.js`) treats `react-hooks/exhaustive-deps` as an error but deliberately downgrades `react-hooks/set-state-in-effect`, `react-hooks/refs`, and `react-hooks/purity` to warnings ("existing patterns predate react-hooks v7") — don't treat those three as blocking, and don't mass-fix them as a drive-by.
- Server code is plain ESM Node (`"type": "module"` in `package.json`); `server/**`, `scripts/**`, `server.js`, and `vite.config.js` get Node globals in ESLint, everything else gets browser globals.
