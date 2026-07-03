import { SUPABASE_URL, SUPABASE_ANON } from '../infrastructure/supabase/SupabaseClient.js';
import { UserMapper } from '../mappers/index.js';

const userMapper = new UserMapper();

export class SupabaseUserRepository {
  constructor(supabaseClient) {
    this._client = supabaseClient;
  }

  async findById(id, token) {
    const t = token || this._client.getToken();
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${t}` },
    });
    if (!res.ok) throw new Error('Failed to get user info');
    const data = await res.json();
    return userMapper.fromAuthResponse(data);
  }

  async findByEmail(email, token) {
    const data = await this._client.request(`/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=*`, { token });
    const rows = Array.isArray(data) ? data : [];
    return rows.length > 0 ? rows[0] : null;
  }

  async signUpAnonymously() {
    const data = await this._client.authSignUp();
    this._client.setTokens(data.access_token, data.refresh_token);
    const user = userMapper.fromAnonResponse(data.user);
    return {
      user,
      token: data.access_token,
      refreshToken: data.refresh_token,
    };
  }

  async exchangeGoogleToken(idToken) {
    const data = await this._client.authExchangeGoogleToken(idToken);
    this._client.setTokens(data.access_token, data.refresh_token);
    const user = userMapper.fromAuthResponse(data.user);
    return {
      user,
      token: data.access_token,
      refreshToken: data.refresh_token,
    };
  }
}
