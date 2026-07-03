// REQUIRED: Set these URLs before publishing. Change the values below or
// set self.__NIKKEL_CONFIG before the service worker initialises.
//   VIEWER_BASE — production viewer domain (e.g. https://nikkel.app)
//   API_URL     — production Railway API (e.g. https://api.nikkel.app)
//   CHROME_STORE_URL — Chrome Web Store listing (optional, used by the
//                      download page when published to the store)

function must(name, raw) {
  const v = (raw || '').replace(/\/+$/, '');
  if (!v) throw new Error(`[Nikkel] ${name} is not configured. Open src/config/index.js and set a value for ${name}.`);
  if (/localhost|127\.0\.0\.1/.test(v)) console.warn(`[Nikkel] ${name} is set to ${v} — not suitable for production.`);
  return v;
}

function optional(name, raw) {
  const v = (raw || '').replace(/\/+$/, '');
  if (!v) return '';
  if (/localhost|127\.0\.0\.1/.test(v)) console.warn(`[Nikkel] ${name} is set to ${v} — not suitable for production.`);
  return v;
}

// Override via self.__NIKKEL_CONFIG if needed (e.g. CI builds).
const cfg = self.__NIKKEL_CONFIG || {};

export const VIEWER_BASE = must('VIEWER_BASE', cfg.VIEWER_BASE);
export const API_URL = must('API_URL', cfg.API_URL);
export const CHROME_STORE_URL = optional('CHROME_STORE_URL', cfg.CHROME_STORE_URL);
export { features } from './features.js';
