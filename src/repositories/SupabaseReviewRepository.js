import { ReviewMapper } from '../mappers/index.js';

const reviewMapper = new ReviewMapper();

export class SupabaseReviewRepository {
  constructor(supabaseClient) {
    this._client = supabaseClient;
  }

  // TODO: Implement when ReviewService is connected
  // async findById(id, token) { return this._find('/rest/v1/reviews', { id }, token); }
  // async findByProject(projectId, token) { ... }
  // async findByShareToken(shareToken, token) { ... }
  // async create(data, token) { ... }
  // async update(id, data, token) { ... }
  // async delete(id, token) { ... }
}
