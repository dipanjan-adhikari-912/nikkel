export class Review {
  constructor({ id, projectId, ownerId, shareToken, visibility, createdAt }) {
    this.id = id;
    this.projectId = projectId;
    this.ownerId = ownerId;
    this.shareToken = shareToken || null;
    this.visibility = visibility || 'public';
    this.createdAt = createdAt ? new Date(createdAt) : null;
  }

  get project_id() { return this.projectId; }
  get owner_id() { return this.ownerId; }
  get share_token() { return this.shareToken; }
}
