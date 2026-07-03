export const SUPABASE_URL = 'https://ptyogubndwyanjaenmzy.supabase.co';
export const SUPABASE_ANON = 'sb_publishable_rIIjNoFOiD5H7qhJMUPO3Q_Sjr9rsdl';

export class SupabaseClient {
  constructor() {
    this._token = null;
    this._refreshToken = null;
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

    if (res.status === 401 && this._refreshToken && effectiveToken) {
      try {
        const refreshRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: { apikey: SUPABASE_ANON, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: this._refreshToken }),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          this._token = refreshData.access_token;
          this._refreshToken = refreshData.refresh_token || this._refreshToken;
          headers['Authorization'] = `Bearer ${this._token}`;
          const retry = await fetch(`${SUPABASE_URL}${path}`, { ...fetchOptions, headers });
          if (!retry.ok) {
            let msg = retry.statusText;
            try { const e = await retry.json(); msg = e.message || e.error || e.msg || msg; } catch {}
            throw new Error(msg);
          }
          if (retry.status === 204 || retry.status === 201) {
            const text = await retry.text();
            return text ? JSON.parse(text) : null;
          }
          return retry.json();
        }
      } catch (e) {
        console.warn('[Nikkel] token refresh failed', e?.message);
      }
    }

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
