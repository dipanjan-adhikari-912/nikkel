# Nikkel — Chrome Extension



## Your task



Build the Nikkel Chrome extension from scratch. The full spec is below — read all of it before writing any code.



- Create every file listed under **File structure**

- Follow the **Build order** exactly — each step must load without errors before you move to the next

- Keep all API calls as mocks (`api.js`) — do not add real network calls

- Do not use inline `onclick` / `onchange` / `oninput` attributes anywhere in HTML — Chrome extensions block them via CSP. Wire all events with `addEventListener` in JS

- Do not use `chrome.storage.session` — use `chrome.storage.local` throughout

- The finished extension must load as an unpacked extension at `chrome://extensions` with zero errors in the service worker, popup, and content script consoles



When done, verify by loading the extension, clicking the icon, hitting "Debug — skip login", selecting a project, and confirming the annotation bar appears at the bottom of the page.



---



## What this is



Nikkel is a Chrome extension for webpage annotation. A user ("PM") activates it on any URL, clicks anywhere on the page to drop numbered pins, types a comment per pin, then shares a link. A colleague opens the link, installs the extension if needed, and joins the session to see and reply to the same pins.



Closest reference products: Pastel, Just Beep It.



---



## Architecture decisions (don't change these)



### Manifest V3

Use MV3 throughout. Service worker for background, not background pages.



### Shadow DOM for all injected UI

Every DOM element injected into the host page must use Shadow DOM for style isolation. The host page's CSS must not reach Nikkel's UI; Nikkel's CSS must not leak into the page. There are three injected shadow hosts:



- `#nikkel-bar-host` — the annotation control bar (fixed, bottom: 0, full-width)

- `#nikkel-comment-host` — floating comment input bubble (fixed, near click point)

- `#nikkel-popover-host` — read-only nikkel view popover (fixed, near pin)



Pin elements themselves (`#nikkel-pins` container) are `position: absolute` on `<html>` — not in shadow DOM, because they need to scroll with the page.



### Page-relative pin coordinates

When a user clicks, record `pageX = clientX + scrollX`, `pageY = clientY + scrollY`. Store and render pins at these document-relative coordinates inside `#nikkel-pins` (which is `position: absolute; top: 0; left: 0; overflow: visible` on `<html>`). This means pins scroll naturally with the page without any scroll listener math.



### Body padding

When the bar injects, save `document.body.style.paddingBottom` and add 42px to it. Restore on removal. This prevents the bar from covering page content.



### SPA guard

Wrap a `MutationObserver` on `document.body` watching `childList`. If `#nikkel-bar-host` disappears (React/Next/Vue route change blew it away), re-inject and re-apply the current mode.



### Extension-only collaboration

The share link (`nikkel.app/s/:id`) is an **install gate page only** — it does not show a web viewer or proxy. A colleague who doesn't have the extension sees a landing page explaining what Nikkel is and a "Install for Chrome" CTA. After installing, the extension's `onInstalled` / `tabs.onUpdated` handler detects the `nikkel.app/s/*` URL, fetches session metadata, and auto-opens the popup in join mode. There is no web viewer, no proxy, no DOM snapshot.



### Background as single source of truth

All state (user, token, active project, session, mode) lives in `background.js`. Content script and popup are stateless — they ask background for what they need and send actions to it. Use `chrome.storage.local` to persist across service worker restarts.



### Supabase backend

All API calls are in `api.js`. `background.js` imports it. Content script never calls the network directly. Each function in `api.js` has a mock return so the extension works offline/in dev. To activate real backend: fill in `SUPABASE_URL` and `SUPABASE_ANON`, uncomment the fetch blocks, delete the mock returns.



---



## File structure



```

nikkel-extension/

manifest.json MV3 manifest

background.js Service worker — auth, session state, message routing

content.js Injected into every page — bar, comment bubble, pins, popovers

popup.html Extension popup HTML

popup.js Extension popup logic (ES module)

api.js Supabase stubs (ES module, imported by background.js only)

icons/

icon16.png

icon48.png

icon128.png

```



---



## manifest.json



```json

{

"manifest_version": 3,

"name": "Nikkel",

"version": "0.1.0",

"description": "Drop annotation pins on any webpage. Share sessions with your team.",

"permissions": ["activeTab", "storage", "scripting", "tabs", "clipboardWrite"],

"host_permissions": ["<all_urls>"],

"background": { "service_worker": "background.js", "type": "module" },

"action": { "default_popup": "popup.html", "default_icon": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" } },

"content_scripts": [{ "matches": ["<all_urls>"], "js": ["content.js"], "run_at": "document_idle", "all_frames": false }],

"icons": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }

}

```



---



## Supabase schema



```sql

create table users (

id uuid primary key default gen_random_uuid(),

email text unique not null,

name text,

created_at timestamptz default now()

);



create table projects (

id uuid primary key default gen_random_uuid(),

name text not null,

url text,

owner_id uuid references users(id),

created_at timestamptz default now()

);



create table sessions (

id uuid primary key default gen_random_uuid(),

project_id uuid references projects(id),

created_by uuid references users(id),

created_at timestamptz default now()

);



create table nikkels (

id uuid primary key default gen_random_uuid(),

session_id uuid references sessions(id),

user_id uuid references users(id),

page_x float not null,

page_y float not null,

tag text,

selector text,

element_text text,

comment text not null,

created_at timestamptz default now()

);

```



Enable RLS on all tables. Add policies appropriate to your auth model.



---



## Message passing protocol



All messages use `chrome.runtime.sendMessage`. Background returns `{ ok: true, ...data }` or `{ ok: false, error: string }`.



### Popup → Background



| type | payload | description |

|------|---------|-------------|

| `GET_STATE` | — | Returns `{ user, mode, project, session, pendingJoin }` |

| `SIGN_IN` | `{ email, password }` | Auth. Returns `{ user }` |

| `SIGN_UP` | `{ email, password, name }` | Auth. Returns `{ user }` |

| `SIGN_OUT` | — | Clears state, deactivates content |

| `GET_PROJECTS` | — | Returns `{ projects }` |

| `CREATE_PROJECT` | `{ name, url }` | Returns `{ project }` |

| `ACTIVATE` | `{ project }` | Creates session, tells content to inject bar + enter annotate mode. Background calls content via `chrome.tabs.sendMessage`. Popup should `window.close()` after this. |

| `DEACTIVATE` | — | Tells content to remove bar |

| `JOIN_SESSION` | `{ sessionId, viewOnly }` | Loads remote nikkels, tells content to load them + enter annotate or browse mode |

| `CLEAR_PENDING_JOIN` | — | Clears the pending join state (after popup reads it) |



### Content → Background



| type | payload | description |

|------|---------|-------------|

| `SUBMIT_NIKKEL` | `{ nikkel }` | nikkel = `{ pageX, pageY, tag, selector, elementText, comment }`. Background saves it, then sends `PIN_CONFIRMED` back to the tab. |

| `MODE_CHANGED` | `{ mode }` | Content bar's mode dropdown changed. Background persists new mode. |



### Background → Content (via `chrome.tabs.sendMessage`)



| type | payload | description |

|------|---------|-------------|

| `ACTIVATE` | `{ projectName, sessionId, shareUrl }` | Inject bar, enter annotate mode |

| `DEACTIVATE` | — | Remove everything |

| `PIN_CONFIRMED` | `{ nikkel: { ...all fields, idx } }` | Drop pin on page |

| `LOAD_SESSION` | `{ nikkels, viewOnly, sessionId, shareUrl }` | Load remote pins, enter appropriate mode |



---



## content.js — implementation notes



### Injection guard

```js

if (window.__nikkelLoaded) return;

window.__nikkelLoaded = true;

```



### Bar Shadow DOM template

Include the full bar HTML + CSS as a template string inside content.js. Attach to `#nikkel-bar-host`. Wire all events after `attachShadow`. Key elements:

- `#modeDot` / `#modeLabel` — mode indicator

- `#modeDd` + `.mode-opt[data-mode]` — mode dropdown

- `#inspIdle` / `#inspLive` — inspector display (hide/show on mousemove)

- `#iTag`, `#iText`, `#iSel`, `#iXY` — inspector fields

- `#pinsBtn` / `#pinsBadge` — toggle pin visibility

- `#shareBtn` / `#sharePop` — share popup

- `#shareUrlTxt`, `#copyBtn`, `#shareMeta` — share link UI

- `#doneBtn` — exits annotate mode, sends `MODE_CHANGED: idle` to background



### Comment bubble Shadow DOM template

Appears on click during annotate mode. `position: fixed` near click. Key elements:

- `#cbEl` — label showing the clicked element (e.g. `<button> "Get started"`)

- `#cbTa` — textarea. ⌘↵ submits, Esc closes.

- `#cbCancel` / `#cbSubmit`



On submit: send `SUBMIT_NIKKEL` to background, close bubble.



### Nikkel popover Shadow DOM template

Appears when a pin is clicked. `position: fixed` near pin. Shows pin number, element info, comment text. `#nvClose` removes it.



### Pin rendering

Pins go into `#nikkel-pins` (absolute overlay on `<html>`). Each pin is a plain `div` with:

```js

position: 'absolute'

left: (nikkel.pageX - 13) + 'px'

top: (nikkel.pageY - 13) + 'px'

```

Local pins: `background: #6366f1`. Remote/colleague pins: `background: #0ea5e9`.

On hover: `transform: scale(1.2)` + ring shadow.

On click: show nikkel popover.



### Inspector (mousemove handler)

Runs only in annotate mode. Skip elements that are Nikkel's own UI (`#nikkel-bar-host`, `#nikkel-comment-host`, `#nikkel-popover-host`). Highlight hovered element with `outline: 1.5px solid rgba(99,102,241,.55)`. Clear previous outline on leave. Update inspector fields with tag, innerText (first 60 chars), CSS selector, and clientX/Y.



CSS selector builder: prefer `#id`, else `tag.firstMeaningfulClass`, else just `tag`.



### Keyboard

`Escape` in annotate mode: close comment bubble if open, otherwise exit annotate mode.



### Init (on script load)

```js

chrome.storage.local.get(['nikkelMode', 'nikkelProject', 'nikkelSession'], (r) => {

if (r.nikkelMode === 'annotate' || r.nikkelMode === 'browse') {

// inject bar + re-enter mode (handles same-site navigation)

}

});

```



---



## background.js — implementation notes



### State shape

```js

let state = {

user: null, // { id, email, name }

token: null, // Supabase JWT

project: null, // { id, name, url }

session: null, // { id, share_url }

nikkels: [],

mode: 'idle',

};

```



### Tab URL watcher

```js

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {

if (info.status !== 'complete') return;

const match = tab.url?.match(/nikkel\.app\/s\/([a-z0-9]+)/i);

if (!match) return;

const session = await api.getSession(match[1]);

chrome.storage.session.set({ pendingJoin: session });

chrome.action.setBadgeText({ text: '!', tabId });

chrome.action.setBadgeBackgroundColor({ color: '#6366f1', tabId });

});

```



Popup reads `pendingJoin` via `GET_STATE` and shows the join view.



### Sending to active tab

```js

async function sendToActiveTab(msg) {

const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

try {

return await chrome.tabs.sendMessage(tab.id, msg);

} catch {

// Content script not injected yet — do it manually then retry

await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });

return chrome.tabs.sendMessage(tab.id, msg);

}

}

```



---



## popup.js — implementation notes



### Views

Three views: `#vLogin`, `#vProject`, `#vJoin`. Show one at a time.



### Init flow

1. `GET_STATE` from background

2. If `pendingJoin` → show join view (user landed on `nikkel.app/s/*`)

3. Else if `user` → show project view

4. Else → show login view



### After `ACTIVATE`

Call `window.close()` immediately — the bar is now on the page, popup is not needed.



### After `JOIN_SESSION`

Call `window.close()` — content script loads the session pins.



---



## UX flows



### PM flow

1. Navigates to a staging/client URL

2. Clicks Nikkel icon → popup opens → login or debug skip

3. Selects a project → "Start annotating this page" → popup closes

4. Bar appears at bottom of page. Cursor becomes crosshair.

5. Hovers elements — inspector shows tag / text / selector / coords

6. Clicks anywhere → comment bubble appears near click point

7. Types feedback → Submit (or ⌘↵) → pin drops, bubble closes

8. Repeats for more pins

9. Clicks 🔗 Share on the bar → copies `nikkel.app/s/:id`

10. Pastes link in Slack/email to colleague



### Colleague flow

1. Receives `nikkel.app/s/:id` link

2. Opens it in Chrome — sees install gate page (separate web app, not this extension)

3. Installs Nikkel from Chrome Web Store

4. Extension detects the `nikkel.app/s/*` URL, badges icon

5. Opens popup → join view shows (project name, host, nikkel count)

6. Clicks "Join — add my annotations" → popup closes

7. Remote pins load on page (sky blue), bar appears in annotate mode

8. Can add their own pins (indigo) and view existing ones



---



## api.js — structure



Export one async function per operation. Each has:

1. A `// TODO:` comment showing the exact Supabase REST endpoint and body

2. A mock `return` below it that returns real-shaped data



Functions needed:

- `signIn(email, password)` → `{ user, token }`

- `signUp(email, password, name)` → `{ user, token }`

- `getProjects(token)` → `Project[]`

- `createProject(name, url, token)` → `Project`

- `createSession(projectId, token)` → `{ id, share_url }`

- `getSession(sessionId)` → `{ id, project_name, project_url, owner_name, nikkel_count }`

- `submitNikkel(nikkel, sessionId, token)` → `{ id, ...nikkel }`

- `getSessionNikkels(sessionId, token)` → `Nikkel[]`



Config at top:

```js

export const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co'; // TODO

export const SUPABASE_ANON = 'YOUR_ANON_KEY'; // TODO

```



---



## Build order (recommended)



1. `manifest.json` + icons — get the extension loadable first

2. `api.js` — stubs only, no real network calls yet

3. `background.js` — message handler skeleton + `sendToActiveTab` helper

4. `content.js` — bar injection first (hardcode annotate mode), then comment bubble, then pins, then popover

5. `popup.html` + `popup.js` — login view → project view → activate flow

6. Wire full message loop: popup ACTIVATE → background → content → PIN_CONFIRMED → content drops pin

7. Share link + join flow: tab watcher → pending join → popup join view → LOAD_SESSION → content loads remote pins

8. Supabase: swap mocks for real fetch calls in `api.js` one function at a time



---



## Style tokens (use these everywhere for consistency)



```

Brand: #6366f1 (indigo-500), hover #4f46e5 (indigo-600), light bg #eef2ff

Bar bg: #0f172a, border #1e293b, text #94a3b8, strong text #e2e8f0

Green: #10b981 (annotate mode dot)

Amber: #f59e0b (browse mode dot)

Slate: #64748b (idle mode dot)

Sky: #0ea5e9 (remote/colleague pins)

```



Bar height: 42px. Pin diameter: 26px. Comment bubble width: 284px. Nikkel popover width: 264px.



---



## What is NOT in scope for this extension



- Web viewer / proxy — the share link is install-gate only, handled by a separate `nikkel.app` web app

- AI triage / Jira integration — post-MVP

- Real-time multiplayer (live cursor sync) — post-MVP; session join is snapshot-based for now

- Safari / Firefox — Chrome only for now 


