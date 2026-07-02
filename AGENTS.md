# Nikkel — Agent Guide

## Repo layout

- **Root** — active Chrome extension (MV3). The extension loads from here.
  - `manifest.json`, `background.js`, `content.js`, `popup.js`, `popup.html`, `api.js`
  - `debug.html`/`debug.js` — endpoint tester (open via `chrome.runtime.getURL('debug.html')`)
  - `schema.sql` — Supabase DDL (drop and recreate to reset)
- `extension/` — stale organized copy of a past version, **not used by Chrome**
- `api/` — Node.js Express backend (separate project)
- `web/` — Next.js frontend (separate project)
- `README.md`, `.md`, `phase-1-extension-mvp.md` — dated spec docs; **do not trust** for current implementation

## Architecture (current)

- **MV3** — service worker (`background.js`), no background page
- **Anonymous-first onboarding** — no email/password. "Start Review" creates an anonymous Supabase user + project automatically
- **Google OAuth** via `chrome.identity.launchWebAuthFlow` → Supabase `/auth/v1/authorize?provider=google`. Redirect URL must be `https://{EXTENSION_ID}.chromiumapp.org/`
- **Supabase REST API** (not SDK) — all fetches go through `api.js` -> `supabaseFetch()`. Uses `fetch` directly, not `@supabase/supabase-js`
- **Token refresh** — `supabaseFetch()` auto-refreshes JWT on 401 via `/auth/v1/token?grant_type=refresh_token`
- **Per-tab state** — background has `globalState` (auth) + `tabState` Map keyed by `tabId`. Each tab has its own `mode`, `project`, `pins`, `url`, `title`. No per-tab info is shared globally.
- **Only one annotating tab at a time** — entering annotate mode on a tab exits annotate on all other tabs via `MODE_CHANGED` handler
- **Pins filtered by projectId + pageUrl** — `getProjectNikkels()` now takes a `pageUrl` param. Supabase query includes `&page_url=eq.${url}`, so only page-specific pins are returned.
- **Background is single source of truth** — all state lives in `background.js`. Content and popup are stateless, communicate via `chrome.runtime.sendMessage`
- **`tabs.onActivated`** — updates tab state URL/title, sends ACTIVATE if tab has a project
- **`tabs.onUpdated`** — refreshes URL in tab state on navigation
- **`tabs.onRemoved`** — cleans up tab state on tab close
- **`GET_PAGE_CONTEXT`** — content script responds with fresh `{ url, title }` on demand
- **Popup always queries active tab** — `init()` sends `GET_STATE` with `tabId` and fetches fresh page context from the content script
- **Shadow DOM** for injected UI — `#nikkel-bar-host`, `#nikkel-comment-host`, `#nikkel-popover-host`. Pins container (`#nikkel-pins`) is a plain `position: absolute` div on `<html>` (not shadow DOM) so pins scroll with the page
- **Page-relative pin coords** — `pageX = clientX + scrollX`, `pageY = clientY + scrollY`, rendered at `left: (pageX - 13)px; top: (pageY - 13)px`
- **No auto-reinjection** — `MutationObserver` was removed. Bar is only injected by user action. SPA navigation guard polls `location.href` and calls `removeBar()` on route changes
- **Global toggle** — popup has a ⏻ power button that disables/enables the whole extension. When disabled, all tab state is cleared and no tabs are activated.

## Key constraints

- **No inline `onclick`/`onchange`/`oninput`** — Chrome CSP blocks them in extension pages. Use `addEventListener`
- **Use `chrome.storage.local` only** — never `chrome.storage.session`
- **All messages return `{ ok: true, ... }` or `{ ok: false, error: string }`**

## Message protocol (Popup ↔ Background ↔ Content)

### Popup → Background
| type | payload | description |
|------|---------|-------------|
| `GET_STATE` | `{ tabId }` | Returns `{ user, project, mode, isAnonymous, url, title }` for that tab |
| `START_REVIEW` | `{ tabId, title, url }` | Anon sign-in (if needed), create project, send ACTIVATE to tab |
| `STOP_REVIEW` | `{ tabId }` | Clear tab state, send DEACTIVATE to tab |
| `SIGN_IN_GOOGLE` | — | OAuth via `chrome.identity.launchWebAuthFlow` |
| `SIGN_OUT` | — | Clear all state across all tabs |
| `TOGGLE_DISABLED` | `{ disabled, tabId }` | Enable/disable extension globally |

### Content → Background
| type | payload | description |
|------|---------|-------------|
| `SUBMIT_NIKKEL` | `{ nikkel }` | nikkel = `{ pageX, pageY, pageUrl, viewportW, viewportH, tag, selector, elementText, comment, idx }` |
| `MODE_CHANGED` | `{ mode }` | Persist mode change per tab (entering annotate exits all other tabs) |
| `SIGN_IN_GOOGLE` | — | Same as popup |
| `GET_PAGE_CONTEXT` | — | Returns `{ url, title }` from the page |

### Background → Content
| type | payload | description |
|------|---------|-------------|
| `ACTIVATE` | `{ projectName, sessionId, shareUrl }` | Inject bar, enter annotate mode |
| `DEACTIVATE` | — | Remove bar, reset cursor |
| `PIN_CONFIRMED` | `{ nikkel }` | Drop pin on page |

## Database schema (`schema.sql`)

Two tables: `projects` and `nikkels`. RLS policies — anonymous users can create projects and nikkels.

Key columns:
- `projects`: `owner_id` (not null, default `auth.uid()`), `title`, `base_url`
- `nikkels`: `project_id` (FK), `owner_id`, `page_url`, `dom_selector`, `x`, `y`, `viewport_w`, `viewport_h`, `tag`, `element_text`, `comment`, `idx`

After running schema, refresh PostgREST cache: `NOTIFY pgrst, 'reload schema';`

## Supabase config required

1. **Enable anonymous sign-ins** in Auth → Settings
2. **Google provider** in Auth → Providers (client ID/secret from Google Cloud Console)
3. **Add redirect URL** `https://{EXTENSION_ID}.chromiumapp.org/` to Auth → Settings URL whitelist AND Google Cloud Console authorized redirect URIs

## Style tokens

- Brand: `#6366f1` / hover `#4f46e5`
- Bar bg: `#0f172a`, border `#1e293b`, text `#94a3b8`, strong `#e2e8f0`
- Pin bg (local): `#6366f1`, (remote): `#0ea5e9`
- Bar height: 42px. Pin diameter: 26px. Comment bubble: 284px wide. Popover: 264px wide.

## Debugging

Open `chrome-extension://{EXTENSION_ID}/debug.html` for endpoint testing (anon sign-in, CRUD projects/nikkels). The popup console (right-click → Inspect) shows `[Popup]`/`[BG]` prefixed logs.
