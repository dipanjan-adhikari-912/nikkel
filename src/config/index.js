// Production defaults. Override via self.__NIKKEL_CONFIG for local development.
//   VIEWER_BASE       — required; Vercel viewer domain
//   API_URL           — required; Railway API endpoint
//   CHROME_STORE_URL  — optional; set when published to Chrome Web Store

const VIEWER = 'https://nikkel-wheat.vercel.app';
const API = 'https://attractive-imagination-production-eb6b.up.railway.app';

function must(name, raw) {
  const v = (raw || '').replace(/\/+$/, '');
  if (!v) throw new Error(`[Nikkel] ${name} is not configured. Set a value via self.__NIKKEL_CONFIG or edit src/config/index.js.`);
  return v;
}

// Override via self.__NIKKEL_CONFIG — e.g. for local development with a local server.
const cfg = self.__NIKKEL_CONFIG || {};

export const VIEWER_BASE = must('VIEWER_BASE', cfg.VIEWER_BASE || VIEWER);
export const API_URL = must('API_URL', cfg.API_URL || API);
export const CHROME_STORE_URL = (cfg.CHROME_STORE_URL || '').replace(/\/+$/, '');
export { features } from './features.js';
