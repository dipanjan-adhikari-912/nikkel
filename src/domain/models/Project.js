export class Project {
  constructor({ id, title, baseUrl, ownerId, createdAt }) {
    this.id = id;
    this.title = title || 'Untitled Review';
    this.baseUrl = baseUrl || '';
    this.ownerId = ownerId;
    this.createdAt = createdAt ? new Date(createdAt) : null;
  }

  get url() {
    return this.baseUrl;
  }

  get base_url() { return this.baseUrl; }
  get owner_id() { return this.ownerId; }
  get created_at() { return this.createdAt ? this.createdAt.toISOString() : null; }
}
