import { User } from '../domain/models/index.js';

export class UserMapper {
  fromDB(row) {
    return new User({
      id: row.id,
      email: row.email,
      name: row.name || row.user_metadata?.name,
      isAnonymous: row.is_anonymous !== undefined ? row.is_anonymous : !row.email,
    });
  }

  fromAuthResponse(authUser) {
    return new User({
      id: authUser.id,
      email: authUser.email || null,
      name: authUser.user_metadata?.name || null,
      isAnonymous: false,
    });
  }

  fromAnonResponse(anonUser) {
    return new User({
      id: anonUser.id,
      email: null,
      name: null,
      isAnonymous: true,
    });
  }

  toDB(user) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      is_anonymous: user.isAnonymous,
    };
  }
}
