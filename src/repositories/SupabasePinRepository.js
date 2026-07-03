import { PinMapper } from '../mappers/index.js';

const pinMapper = new PinMapper();

export class SupabasePinRepository {
  constructor(supabaseClient) {
    this._client = supabaseClient;
  }

  async findById(id, token) {
    const data = await this._client.request(`/rest/v1/nikkels?id=eq.${id}&select=*`, { token });
    const rows = Array.isArray(data) ? data : [];
    return rows.length > 0 ? pinMapper.fromDB(rows[0]) : null;
  }

  async findByReview(reviewId, options = {}, token) {
    let path = `/rest/v1/nikkels?review_id=eq.${reviewId}&order=idx.asc`;
    if (options.pageUrl) path += `&page_url=eq.${encodeURIComponent(options.pageUrl)}`;
    const rows = await this._client.request(path, { token });
    return (rows || []).map(r => pinMapper.fromDB(r));
  }

  async create(data, token) {
    const result = await this._client.request('/rest/v1/nikkels', {
      method: 'POST',
      token,
      prefer: 'return=representation',
      body: JSON.stringify(pinMapper.toDB(data)),
    });
    const row = Array.isArray(result) ? result[0] : result;
    if (!row) throw new Error('Empty response from Supabase insert');
    return pinMapper.fromDB(row);
  }

  async update(id, data, token) {
    await this._client.request(`/rest/v1/nikkels?id=eq.${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(pinMapper.toDB(data)),
    });
    return this.findById(id, token);
  }

  async delete(id, token) {
    await this._client.request(`/rest/v1/nikkels?id=eq.${id}`, {
      method: 'DELETE',
      token,
    });
    return true;
  }
}
