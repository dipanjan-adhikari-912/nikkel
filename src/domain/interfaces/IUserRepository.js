/**
 * Interface for user data access.
 * @interface IUserRepository
 */
export class IUserRepository {
  /**
   * @param {string} id
   * @returns {Promise<import('./../models/User.js').User|null>}
   */
  async findById(id) { throw new Error('not implemented'); }

  /**
   * @param {string} email
   * @returns {Promise<import('./../models/User.js').User|null>}
   */
  async findByEmail(email) { throw new Error('not implemented'); }

  /**
   * @param {import('./../models/User.js').User} user
   * @returns {Promise<import('./../models/User.js').User>}
   */
  async create(user) { throw new Error('not implemented'); }

  /**
   * @param {import('./../models/User.js').User} user
   * @returns {Promise<import('./../models/User.js').User>}
   */
  async update(user) { throw new Error('not implemented'); }

  /**
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) { throw new Error('not implemented'); }
}
