/**
 * Interface for pin (nikkel) data access.
 * @interface IPinRepository
 */
export class IPinRepository {
  /**
   * @param {string} id
   * @returns {Promise<import('./../models/Pin.js').Pin|null>}
   */
  async findById(id) { throw new Error('not implemented'); }

  /**
   * @param {string} reviewId
   * @param {object} [options]
   * @param {string} [options.pageUrl]
   * @returns {Promise<import('./../models/Pin.js').Pin[]>}
   */
  async findByReview(reviewId, options = {}) { throw new Error('not implemented'); }

  /**
   * @param {import('./../models/Pin.js').Pin} pin
   * @returns {Promise<import('./../models/Pin.js').Pin>}
   */
  async create(pin) { throw new Error('not implemented'); }

  /**
   * @param {import('./../models/Pin.js').Pin} pin
   * @returns {Promise<import('./../models/Pin.js').Pin>}
   */
  async update(pin) { throw new Error('not implemented'); }

  /**
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) { throw new Error('not implemented'); }
}
