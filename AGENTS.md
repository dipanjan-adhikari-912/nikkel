# Nikkel — Agent Guide

## Repo layout

- **Root** — active Chrome extension (MV3), loaded unpacked. No package.json, no build step.
  - `background.js` (~700 lines, most business logic lives here) — ES module service worker (`"type": "module"`)
  - `content.js` — injected into `<all_urls>` at `document_idle`
  - `popup.html`/`popup.js` — popup UI
  - `manifest.json`, `schema.sql`, `icons/`
- `src/` — service-oriented layer (DI → services → repos → SupabaseClient). Thin wrappers; real logic is in `background.js`.
  - `config/index.js` — use `self.__NIKKEL_CONFIG` at runtime to override, don't edit the file for local dev
- `web/` — Next.js app (TypeScript, Tailwind v4, `@supabase/supabase-js`). **Serves as viewer + backend** (API routes in `web/app/api/`). Extension talks to it for board loads and collaborator claims.

## Architecture

- **MV3 service worker** (`background.js`) — all state lives here. Content/popup are stateless.
- **Anonymous-first onboarding** — "Start Review" creates an anonymous Supabase user + project. No email/password.
- **Google OAuth** via `chrome.identity.launchWebAuthFlow` → Supabase `/auth/v1/authorize?provider=google`. Redirect must be `https://{EXTENSION_ID}.chromiumapp.org/`.
- **Supabase REST API** (not SDK) — all fetches use `fetch` directly via `SupabaseClient` in `src/`. Token refresh on 401 via `/auth/v1/token?grant_type=refresh_token`.
- **Extension talks directly to Supabase** — does NOT proxy through `web/` API (except for `/api/board/`, `/api/projects/*/collaborators`).
- **Per-tab state** — `tabState` Map keyed by `tabId`. Only one annotating tab at a time.
- **`lastProject` auto-resume** (`background.js:159`) — `tabs.onUpdated` checks `globalState.lastProject.baseUrl` and auto-activates bar when navigating back.
- **`sendToTab` with retry** (`background.js:100`) — injects `content.js` on failure. 8 retries at 500ms intervals.
- **Pin idx is manually computed** — background fetches `max(idx)+1` from existing nikkels per review (not auto-increment).
- **Nikkel ping protocol** (`content.js:1130`) — content script responds to `window.postMessage` for `PING`, `OPEN_PROJECT`, `LOAD_REVIEW`.
- **SPA navigation guard** — polls `location.href` every 1s, calls `removeBar()` on change.
- **Shadow DOM** — injected UI in `#nikkel-bar-host`, `#nikkel-comment-host`, `#nikkel-popover-host`. Pins container is plain div on `<html>` (not shadow).
- **Popup has dangling `settings.html` link** (`popup.js:240`) — no settings.html exists.

## Key constraints

- **No inline `onclick`/`onchange`/`oninput`** — Chrome CSP blocks them. Use `addEventListener`.
- **Use `chrome.storage.local` only** — never `chrome.storage.session`.
- **All messages return `{ ok: true, ... }` or `{ ok: false, error: string }`**.
- **No tests anywhere** in the repo.

## Commands

- Extension: **no build/lint/test commands** — loaded unpacked, served from disk directly.
- `web/`: `npm run dev` / `npm run build` / `npm run start` (standard Next.js).

## Message protocol

Full protocol tables are documented in the existing file below. Key types:

### Popup → Background
- `GET_STATE` `{ tabId }` — also does JWT refresh if expired (background.js:201)
- `START_REVIEW` — requires signed-in user (background.js:218)
- `SHARE` — calls `ensureProjectReview` + `ensureShareToken`
- `TOGGLE_DISABLED` — clears all tab state
- `ACTIVATE_TAB` — re-sends ACTIVATE to tab if project exists

### Content → Background
- `SUBMIT_NIKKEL` — validates project access, computes `idx = max+1`, calls `pinService.create`
- `MODE_CHANGED` — entering annotate mode exits annotate on all other tabs
- `GET_NIKKELS` `{ pageUrl }` — filtered by pageUrl; pass `{ allPages: true }` to skip filter

### Background → Content
- `LOAD_SESSION` — full session load (nikkels included in payload, no pin-by-pin)
- `PIN_CONFIRMED` — single pin confirmed after backend save

## Database (`schema.sql`)

Tables: `projects`, `reviews`, `nikkels`, `replies`, `profiles`, `project_collaborators`, `project_read_state`.

Key behaviors:
- `nikkels.idx` is NOT auto-increment — computed by background as `max(idx)+1`
- RLS: anonymous users can insert reviews/nikkels only if project owner or collaborator (`owner_or_collaborator_can_add_nikkels` policy)
- After schema change: `NOTIFY pgrst, 'reload schema'`

## Backend

- `web/` (Next.js) provides `api/board/[shareToken]` for public review viewing
- Extension claims project access via `api/projects/[id]/collaborators` (POST)
- `VIEWER_BASE` = `https://nikkel-alpha.vercel.app` (from `src/config/index.js`)
- `API_URL` = same domain (`src/config/index.js`)

## Style

- Brand: `#6366f1` / `#4f46e5`
- Bar: bg `#0f172a`, border `#1e293b`, text `#94a3b8`, strong `#e2e8f0`
- Pin: 26px diameter, local `#06b6d4` (cyan), remote uses `pinColor(userId)` hashing
- Bar height: 42px. Comment bubble: 284px. Popover: 264px.
