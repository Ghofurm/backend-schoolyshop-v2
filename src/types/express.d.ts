import type { AuthUser } from '../services/auth.service.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}
