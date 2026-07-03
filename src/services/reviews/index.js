export class ReviewService {
  constructor(/* reviewRepository */) {
    // TODO: Accept ReviewRepository when implemented
  }

  // TODO: Implement when review management features are built

  /**
   * Fetch review by id.
   * @param {string} id
   * @param {string} token
   * @returns {Promise<import('../../domain/models/Review.js').Review|null>}
   */
  async getById(id, token) {
    throw new Error('ReviewService.getById not implemented');
  }

  /**
   * Fetch all reviews for a project.
   * @param {string} projectId
   * @param {string} token
   * @returns {Promise<import('../../domain/models/Review.js').Review[]>}
   */
  async getByProject(projectId, token) {
    throw new Error('ReviewService.getByProject not implemented');
  }

  /**
   * Fetch review by share token.
   * @param {string} shareToken
   * @returns {Promise<import('../../domain/models/Review.js').Review|null>}
   */
  async getByShareToken(shareToken) {
    throw new Error('ReviewService.getByShareToken not implemented');
  }

  /**
   * Create a new review for a project.
   * @param {string} projectId
   * @param {string} ownerId
   * @param {string} token
   * @returns {Promise<import('../../domain/models/Review.js').Review|null>}
   */
  async create(projectId, ownerId, token) {
    throw new Error('ReviewService.create not implemented');
  }

  /**
   * Update a review (e.g. change visibility, regenerate share token).
   * @param {string} id
   * @param {object} data
   * @param {string} token
   * @returns {Promise<import('../../domain/models/Review.js').Review>}
   */
  async update(id, data, token) {
    throw new Error('ReviewService.update not implemented');
  }

  /**
   * Delete a review and its associated pins.
   * @param {string} id
   * @param {string} token
   * @returns {Promise<boolean>}
   */
  async delete(id, token) {
    throw new Error('ReviewService.delete not implemented');
  }

  /**
   * Set review visibility.
   * @param {string} id
   * @param {'public'|'private'} visibility
   * @param {string} token
   * @returns {Promise<import('../../domain/models/Review.js').Review>}
   */
  async setVisibility(id, visibility, token) {
    throw new Error('ReviewService.setVisibility not implemented');
  }

  /**
   * Regenerate share token for a review.
   * @param {string} id
   * @param {string} token
   * @returns {Promise<string>}
   */
  async regenerateShareToken(id, token) {
    throw new Error('ReviewService.regenerateShareToken not implemented');
  }
}
