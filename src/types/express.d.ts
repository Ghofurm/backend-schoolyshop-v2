import type { UserProfile } from '../services/users.service.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: UserProfile;
  }
}
