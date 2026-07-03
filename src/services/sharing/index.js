import { VIEWER_BASE } from '../../config/index.js';

export class ShareService {
  constructor(supabaseClient, projectRepository) {
    this._client = supabaseClient;
    this._projectRepo = projectRepository;
  }

  async ensureProjectReview(projectId, userId, token) {
    try {
      const existing = await this._client.request(`/rest/v1/reviews?project_id=eq.${projectId}&order=created_at.desc&limit=1`, { token });
      const rows = Array.isArray(existing) ? existing : [];
      if (rows.length > 0) return rows[0];
    } catch (e) {
      console.warn('[ShareService] Error checking reviews', e.message);
    }
    try {
      const data = await this._client.request('/rest/v1/reviews', {
        method: 'POST',
        token,
        prefer: 'return=representation',
        body: JSON.stringify({ project_id: projectId, owner_id: userId }),
      });
      const review = Array.isArray(data) ? data[0] : data;
      if (!review) {
        console.error('[ShareService] createReview returned empty');
        return null;
      }
      return review;
    } catch (e) {
      console.error('[ShareService] Failed to create review', e.message);
      return null;
    }
  }

  async ensureShareToken(reviewId, token) {
    const data = await this._client.request(`/rest/v1/reviews?id=eq.${reviewId}&select=share_token`, { token });
    const review = Array.isArray(data) ? data[0] : data;
    if (review?.share_token) return review.share_token;

    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const shareToken = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

    await this._client.request(`/rest/v1/reviews?id=eq.${reviewId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ share_token: shareToken }),
    });
    return shareToken;
  }

  async getReviewByShareToken(shareToken) {
    const data = await this._client.request(`/rest/v1/reviews?share_token=eq.${shareToken}&select=*,project:project_id(*)`);
    const rows = Array.isArray(data) ? data : [];
    return rows.length > 0 ? rows[0] : null;
  }

  buildShareUrl(shareToken) {
    return `${VIEWER_BASE}/review/${shareToken}`;
  }
}
