export class AuthService {
  constructor(userRepository) {
    this._repo = userRepository;
  }

  async signInAnonymously() {
    const result = await this._repo.signUpAnonymously();
    return {
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
    };
  }

  async exchangeGoogleToken(idToken) {
    const result = await this._repo.exchangeGoogleToken(idToken);
    return {
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
    };
  }

  async getUserInfo(token) {
    return this._repo.findById(null, token);
  }
}
