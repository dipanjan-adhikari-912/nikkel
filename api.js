export const SUPABASE_URL = 'https://ptyogubndwyanjaenmzy.supabase.co';
export const SUPABASE_ANON = 'sb_publishable_rIIjNoFOiD5H7qhJMUPO3Q_Sjr9rsdl';

let _token = null;
let _refreshToken = null;

export function setTokens(at, rt) {
  _token = at;
  _refreshToken = rt;
}

export function getToken() { return _token; }
export function getRefreshToken() { return _refreshToken; }

async function supabaseFetch(path, options = {}) {
  const { token: t, prefer, ...fetchOptions } = options;
  const headers = {
    apikey: SUPABASE_ANON,
    'Content-Type': 'application/json',
  };
  const effectiveToken = t || _token;
  if (effectiveToken) headers['Authorization'] = `Bearer ${effectiveToken}`;
  if (prefer) headers['Prefer'] = prefer;
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...fetchOptions, headers });

  if (res.status === 401 && _refreshToken && effectiveToken) {
    try {
      const refreshRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: _refreshToken }),
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        _token = refreshData.access_token;
        _refreshToken = refreshData.refresh_token || _refreshToken;
        headers['Authorization'] = `Bearer ${_token}`;
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

export async function signInAnonymously() {
  const data = await supabaseFetch('/auth/v1/signup', {
    method: 'POST',
    body: '{}',
  });
  _token = data.access_token;
  _refreshToken = data.refresh_token;
  return {
    user: { id: data.user.id, is_anonymous: true },
    token: data.access_token,
    refreshToken: data.refresh_token,
  };
}

export async function exchangeGoogleToken(idToken) {
  const data = await supabaseFetch('/auth/v1/token?grant_type=id_token', {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken, provider: 'google' }),
  });
  _token = data.access_token;
  _refreshToken = data.refresh_token;
  return {
    user: { id: data.user.id, email: data.user.email, name: data.user.user_metadata?.name, is_anonymous: false },
    token: data.access_token,
    refreshToken: data.refresh_token,
  };
}

export async function getProjects(token) {
  return supabaseFetch('/rest/v1/projects?select=*&order=created_at.desc', { token });
}

export async function createProject(title, baseUrl, userId, token) {
  const data = await supabaseFetch('/rest/v1/projects', {
    method: 'POST',
    token,
    prefer: 'return=representation',
    body: JSON.stringify({ title, base_url: baseUrl, owner_id: userId }),
  });
  return Array.isArray(data) ? data[0] : data;
}

export async function submitNikkel(data, token) {
  const result = await supabaseFetch('/rest/v1/nikkels', {
    method: 'POST',
    token,
    prefer: 'return=representation',
    body: JSON.stringify(data),
  });
  const row = Array.isArray(result) ? result[0] : result;
  if (!row) throw new Error('Empty response from Supabase insert');
  return {
    id: row.id,
    reviewId: row.review_id,
    pageUrl: row.page_url,
    pageX: row.x,
    pageY: row.y,
    tag: row.tag,
    selector: row.dom_selector,
    elementText: row.element_text,
    comment: row.comment,
    idx: row.idx,
    userId: row.owner_id,
  };
}

export async function getReviewNikkels(reviewId, pageUrl, token) {
  let path = `/rest/v1/nikkels?review_id=eq.${reviewId}&order=idx.asc`;
  if (pageUrl) path += `&page_url=eq.${encodeURIComponent(pageUrl)}`;
  const rows = await supabaseFetch(path, { token });
  return (rows || []).map(r => ({
    id: r.id,
    reviewId: r.review_id,
    pageUrl: r.page_url,
    pageX: r.x,
    pageY: r.y,
    tag: r.tag,
    selector: r.dom_selector,
    elementText: r.element_text,
    comment: r.comment,
    idx: r.idx,
    userId: r.owner_id,
  }));
}

export async function createReview(projectId, userId, token) {
  const data = await supabaseFetch('/rest/v1/reviews', {
    method: 'POST',
    token,
    prefer: 'return=representation',
    body: JSON.stringify({ project_id: projectId, owner_id: userId }),
  });
  return Array.isArray(data) ? data[0] : data;
}

export async function ensureShareToken(reviewId, token) {
  const data = await supabaseFetch(`/rest/v1/reviews?id=eq.${reviewId}&select=share_token`, { token });
  const review = Array.isArray(data) ? data[0] : data;
  if (review?.share_token) return review.share_token;

  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const shareToken = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

  await supabaseFetch(`/rest/v1/reviews?id=eq.${reviewId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ share_token: shareToken }),
  });
  return shareToken;
}
