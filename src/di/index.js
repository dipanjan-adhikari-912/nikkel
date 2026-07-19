import { SupabaseClient } from '../infrastructure/supabase/SupabaseClient.js';
import { SupabaseProjectRepository, SupabasePinRepository, SupabaseUserRepository } from '../repositories/index.js';
import { AuthService, ProjectService, PinService, ShareService } from '../services/index.js';

class Container {
  constructor() {
    this.supabaseClient = new SupabaseClient();
    this.projectRepository = new SupabaseProjectRepository(this.supabaseClient);
    this.pinRepository = new SupabasePinRepository(this.supabaseClient);
    this.userRepository = new SupabaseUserRepository(this.supabaseClient);
    this.authService = new AuthService(this.userRepository);
    this.projectService = new ProjectService(this.projectRepository);
    this.pinService = new PinService(this.pinRepository);
    this.shareService = new ShareService(this.supabaseClient, this.projectRepository);


  }
}

export const container = new Container();
