export class ShareLink {
  constructor({ id, reviewId, token, url, createdAt }) {
    this.id = id;
    this.reviewId = reviewId;
    this.token = token;
    this.url = url || '';
    this.createdAt = createdAt ? new Date(createdAt) : null;
  }
}
