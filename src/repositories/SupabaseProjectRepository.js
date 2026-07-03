import { ProjectMapper } from '../mappers/index.js';

const projectMapper = new ProjectMapper();

export class SupabaseProjectRepository {
  constructor(supabaseClient) {
    this._client = supabaseClient;
  }

  async findById(id, token) {
    const data = await this._client.request(`/rest/v1/projects?id=eq.${id}&select=*`, { token });
    const rows = Array.isArray(data) ? data : [];
    return rows.length > 0 ? projectMapper.fromDB(rows[0]) : null;
  }

  async findByOwner(ownerId, token) {
    const rows = await this._client.request(`/rest/v1/projects?owner_id=eq.${ownerId}&select=*&order=created_at.desc`, { token });
    return (rows || []).map(r => projectMapper.fromDB(r));
  }

  async create(data, token) {
    const result = await this._client.request('/rest/v1/projects', {
      method: 'POST',
      token,
      prefer: 'return=representation',
      body: JSON.stringify(projectMapper.toDB(data)),
    });
    const row = Array.isArray(result) ? result[0] : result;
    return row ? projectMapper.fromDB(row) : null;
  }

  async update(id, data, token) {
    await this._client.request(`/rest/v1/projects?id=eq.${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(projectMapper.toDB(data)),
    });
    return this.findById(id, token);
  }

  async list(token) {
    const rows = await this._client.request('/rest/v1/projects?select=*&order=created_at.desc', { token });
    return (rows || []).map(r => projectMapper.fromDB(r));
  }

  async delete(id, token) {
    await this._client.request(`/rest/v1/projects?id=eq.${id}`, {
      method: 'DELETE',
      token,
    });
    return true;
  }
}
