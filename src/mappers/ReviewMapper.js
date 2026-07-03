import { Review } from '../domain/models/index.js';

export class ReviewMapper {
  fromDB(row) {
    return new Review({
      id: row.id,
      projectId: row.project_id,
      ownerId: row.owner_id,
      shareToken: row.share_token,
      visibility: row.visibility,
      createdAt: row.created_at,
    });
  }

  toDB(review) {
    return {
      project_id: review.projectId,
      owner_id: review.ownerId,
      share_token: review.shareToken,
      visibility: review.visibility,
    };
  }
}
