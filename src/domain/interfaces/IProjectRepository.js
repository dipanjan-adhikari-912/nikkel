/**
 * Interface for project data access.
 * @interface IProjectRepository
 */
export class IProjectRepository {
  /**
   * @param {string} id
   * @returns {Promise<import('./../models/Project.js').Project|null>}
   */
  async findById(id) { throw new Error('not implemented'); }

  /**
   * @param {string} ownerId
   * @returns {Promise<import('./../models/Project.js').Project[]>}
   */
  async findByOwner(ownerId) { throw new Error('not implemented'); }

  /**
   * @param {import('./../models/Project.js').Project} project
   * @returns {Promise<import('./../models/Project.js').Project>}
   */
  async create(project) { throw new Error('not implemented'); }

  /**
   * @param {import('./../models/Project.js').Project} project
   * @returns {Promise<import('./../models/Project.js').Project>}
   */
  async update(project) { throw new Error('not implemented'); }

  /**
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) { throw new Error('not implemented'); }

  /**
   * @returns {Promise<import('./../models/Project.js').Project[]>}
   */
  async list() { throw new Error('not implemented'); }
}
