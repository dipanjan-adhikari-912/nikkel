export const SUPABASE_URL = 'https://ptyogubndwyanjaenmzy.supabase.co';
export const SUPABASE_ANON = 'sb_publishable_rIIjNoFOiD5H7qhJMUPO3Q_Sjr9rsdl';

export class SupabaseClient {
  constructor() {
    this._token = null;
    this._refreshToken = null;
    this._onRefresh = null;
  }

  onRefresh(cb) {
    this._onRefresh = cb;
  }

  setTokens(accessToken, refreshToken) {
    this._token = accessToken;
    this._refreshToken = refreshToken || this._refreshToken;
  }

  getToken() {
    return this._token;
  }

  getRefreshToken() {
    return this._refreshToken;
  }

  async request(path, options = {}) {
    const { token: optToken, prefer, ...fetchOptions } = options;
    const headers = {
      apikey: SUPABASE_ANON,
      'Content-Type': 'application/json',
    };
    const effectiveToken = optToken || this._token;
    if (effectiveToken) headers['Authorization'] = `Bearer ${effectiveToken}`;
    if (prefer) headers['Prefer'] = prefer;
    const res = await fetch(`${SUPABASE_URL}${path}`, { ...fetchOptions, headers });

    if (!res.ok) {
      let errMsg = res.statusText;
      try { const err = await res.json(); errMsg = err.message || err.error || err.msg || errMsg; } catch {}
      throw new Error(errMsg);
    }
    if (res.status === 204 || res.status === 201) {
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    }
    return res.json();
  }

  async authSignUp() {
    return this.request('/auth/v1/signup', {
      method: 'POST',
      body: '{}',
    });
  }

  async authSignUpWithEmail(email, password) {
    return this.request('/auth/v1/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async authSignInWithEmail(email, password) {
    return this.request('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async authExchangeGoogleToken(idToken) {
    return this.request('/auth/v1/token?grant_type=id_token', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken, provider: 'google' }),
    });
  }

  async authRefresh() {
    if (!this._refreshToken) throw new Error('No refresh token');
    return this.request('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: this._refreshToken }),
    });
  }
}
