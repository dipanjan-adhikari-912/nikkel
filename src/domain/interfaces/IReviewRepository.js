/**
 * Interface for review data access.
 * @interface IReviewRepository
 */
export class IReviewRepository {
  /**
   * @param {string} id
   * @returns {Promise<import('./../models/Review.js').Review|null>}
   */
  async findById(id) { throw new Error('not implemented'); }

  /**
   * @param {string} projectId
   * @returns {Promise<import('./../models/Review.js').Review[]>}
   */
  async findByProject(projectId) { throw new Error('not implemented'); }

  /**
   * @param {string} shareToken
   * @returns {Promise<import('./../models/Review.js').Review|null>}
   */
  async findByShareToken(shareToken) { throw new Error('not implemented'); }

  /**
   * @param {import('./../models/Review.js').Review} review
   * @returns {Promise<import('./../models/Review.js').Review>}
   */
  async create(review) { throw new Error('not implemented'); }

  /**
   * @param {import('./../models/Review.js').Review} review
   * @returns {Promise<import('./../models/Review.js').Review>}
   */
  async update(review) { throw new Error('not implemented'); }

  /**
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) { throw new Error('not implemented'); }
}
