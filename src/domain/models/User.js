export class User {
  constructor({ id, email, name, avatarUrl, isAnonymous }) {
    this.id = id;
    this.email = email || null;
    this.name = name || null;
    this.avatarUrl = avatarUrl || null;
    this.isAnonymous = isAnonymous !== false;
  }

  get displayName() {
    return this.name || this.email || this.id?.slice(0, 8) || 'Anonymous';
  }

  get is_anonymous() { return this.isAnonymous; }
}
