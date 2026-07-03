export class PinService {
  constructor(pinRepository) {
    this._repo = pinRepository;
  }

  async create(nikkelData, token) {
    return this._repo.create(nikkelData, token);
  }

  async findByReview(reviewId, options = {}, token) {
    return this._repo.findByReview(reviewId, options, token);
  }

  async update(id, data, token) {
    return this._repo.update(id, data, token);
  }

  async delete(id, token) {
    return this._repo.delete(id, token);
  }
}
