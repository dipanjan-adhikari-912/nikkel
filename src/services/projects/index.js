export class ProjectService {
  constructor(projectRepository) {
    this._repo = projectRepository;
  }

  async create(title, baseUrl, userId, token) {
    const data = await this._repo.create({ title, baseUrl, ownerId: userId }, token);
    if (Array.isArray(data)) return data[0];
    return data;
  }

  async list(token) {
    return this._repo.list(token);
  }

  async getById(id, token) {
    return this._repo.findById(id, token);
  }
}
