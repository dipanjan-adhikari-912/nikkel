# Nikkel — Deployment Checklist

## 1. Supabase

- [ ] **Enable anonymous sign-ins** in Auth → Settings (Providers → Anonymous)
- [ ] **Enable Google provider** in Auth → Providers — set Client ID and Client Secret from Google Cloud Console
- [ ] **Add redirect URI** `https://{EXTENSION_ID}.chromiumapp.org/` to:
  - Supabase Auth → URL Configuration → Redirect URLs
  - Google Cloud Console → APIs & Auth → Credentials → Authorized redirect URIs for your OAuth 2.0 Client ID
- [ ] **Run `schema.sql`** against your Supabase project to create tables (`projects`, `reviews`, `nikkels`, `replies`) and RLS policies
- [ ] **Refresh PostgREST schema cache** after schema changes:
  ```sql
  NOTIFY pgrst, 'reload schema';
  ```
- [ ] **Set environment variables** in Supabase dashboard (or your deployment platform):
  - `SUPABASE_URL` — your project URL (e.g. `https://xxxxxxx.supabase.co`)
  - `SUPABASE_SERVICE_KEY` — service role key (found in Settings → API → `service_role` key)

## 2. Railway (API Server)

The API lives in `api/`. Deploy as a Node.js Express app.

- [ ] **Deploy the `api/` directory** as a Railway service
- [ ] **Set environment variables** in Railway dashboard:
  - `SUPABASE_URL` — same as above
  - `SUPABASE_SERVICE_KEY` — same as above
- [ ] **Confirm health endpoint** responds at `https://your-api.railway.app/health`
- [ ] **Note the deployed URL** — you will need it for the extension config and web viewer (e.g. `https://api.nikkel.railway.app`)

> **Port:** Railway sets `PORT` automatically. The fallback `3001` is for local development only.

## 3. Vercel (Web Viewer)

The web viewer lives in `web/`. Deploy as a Next.js app.

- [ ] **Deploy the `web/` directory** as a Vercel project
- [ ] **Set environment variables** in Vercel dashboard:
  - `NEXT_PUBLIC_API_URL` — your deployed Railway API URL (e.g. `https://api.nikkel.railway.app`)
  - `NEXT_PUBLIC_CHROME_STORE_URL` — optional; set this once the extension is published to the Chrome Web Store (e.g. `https://chromewebstore.google.com/detail/nikkel/xxxxxxxxxx`)
- [ ] **Note the deployed URL** — you will need it as `VIEWER_BASE` in the extension config (e.g. `https://nikkel.vercel.app`)

## 4. Chrome Web Store (Extension)

- [ ] **Create a Chrome Web Store developer account** (one-time $5 fee)
- [ ] **Prepare the extension package:**
  - Set `VIEWER_BASE`, `API_URL`, and optionally `CHROME_STORE_URL` in `src/config/index.js`
  - OR set `self.__NIKKEL_CONFIG` before the service worker initialises (e.g. in a wrapper script)
  - Verify the `manifest.json` version is correct
  - Ensure all icons exist at `icons/icon16.png`, `icon48.png`, `icon128.png`
- [ ] **Important — no build step:** The extension uses raw JS (no bundler). Upload the root directory as-is (or as a ZIP of all needed files)
- [ ] **Upload to Chrome Web Store:**
  - Zip the extension root contents (manifest.json, background.js, content.js, popup.js, popup.html, src/, icons/)
  - Upload to Chrome Web Store Developer Dashboard
  - Fill in store listing details (description, screenshots, promo images)
  - Set permissions — the manifest requests `activeTab`, `storage`, `scripting`, `tabs`, `clipboardWrite`, `identity`
- [ ] **Set the Chrome Web Store URL** as `NEXT_PUBLIC_CHROME_STORE_URL` in Vercel and `CHROME_STORE_URL` in the extension config
- [ ] **Publish** — the web viewer will now link directly to the store instead of showing side-loading instructions

## 5. Extension Config (after deployment)

Edit `src/config/index.js` with your production URLs:

```js
// Example production values
export const VIEWER_BASE = must('VIEWER_BASE', cfg.VIEWER_BASE || 'https://nikkel.vercel.app');
export const API_URL = must('API_URL', cfg.API_URL || 'https://api.nikkel.railway.app');
export const CHROME_STORE_URL = optional('CHROME_STORE_URL', cfg.CHROME_STORE_URL || 'https://chromewebstore.google.com/detail/nikkel/xxxxxxxxxx');
```

Or inject them at runtime via `self.__NIKKEL_CONFIG` before the service worker boots.

## 6. Extension Packaging for Distribution

- [ ] **Before packaging, update** `src/config/index.js` with production URLs
- [ ] **Remove local development overrides** from `src/config/index.js` (the defaults should match production)
- [ ] **Assets to include in the ZIP:**
  - `manifest.json`
  - `background.js`
  - `content.js`
  - `popup.js`
  - `popup.html`
  - `debug.html` / `debug.js` (optional — dev only)
  - `src/` (service layer, DI, repositories, etc.)
  - `schemas/` if any
  - `icons/`
  - `AGENTS.md` (optional — dev notes)
  - `schema.sql` (documentation only)
- [ ] **Test the built extension** by loading it unpacked in Chrome before uploading:
  1. Open `chrome://extensions`
  2. Enable Developer Mode
  3. Click "Load Unpacked"
  4. Select the extension root folder
- [ ] **Verify all endpoints** work with production URLs

## 7. Post-Deployment Verification

- [ ] **API health:** `GET {API_URL}/health` → `{ "status": "ok" }`
- [ ] **Anonymous auth:** Extension can sign in anonymously and create a project
- [ ] **Google auth:** Extension can authenticate via `chrome.identity.launchWebAuthFlow`
- [ ] **Share flow:** Authenticated user can generate share URL → viewer page loads → "Open Review" works
- [ ] **Pins:** Annotating a page saves pins visible to the reviewer on reload
- [ ] **Comments:** Viewing a pin shows comments; submitting a new comment persists
- [ ] **Board page:** `${VIEWER_BASE}/board/{shareToken}` loads with pins and reply form
- [ ] **Download page:** `${VIEWER_BASE}/download` links to Chrome Web Store (if `NEXT_PUBLIC_CHROME_STORE_URL` is set) or shows alpha instructions
- [ ] **Download page (no store):** Shows side-loading steps and troubleshooting if extension not detected
