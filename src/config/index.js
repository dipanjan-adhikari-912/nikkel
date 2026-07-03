// REQUIRED: Set these URLs before publishing. Change the values below.
// In development: http://localhost:3000 and http://localhost:3001.
// In production: your deployed URLs (e.g. https://nikkel.app, https://api.nikkel.app).

function must(name, raw) {
  const v = (raw || '').replace(/\/+$/, '');
  if (!v) throw new Error(`[Nikkel] ${name} is not configured. Open src/config/index.js and set a value for ${name}.`);
  if (/localhost|127\.0\.0\.1/.test(v)) console.warn(`[Nikkel] ${name} is set to ${v} — not suitable for production.`);
  return v;
}

// Override via self.__NIKKEL_CONFIG if needed (e.g. CI builds).
const cfg = self.__NIKKEL_CONFIG || {};

export const VIEWER_BASE = must('VIEWER_BASE', cfg.VIEWER_BASE || 'http://localhost:3000');
export const API_URL = must('API_URL', cfg.API_URL || 'http://localhost:3001');
export { features } from './features.js';
