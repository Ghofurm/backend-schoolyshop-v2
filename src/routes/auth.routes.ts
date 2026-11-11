import { Router } from 'express';
import {
  forgotPassword,
  login,
  logout,
  me,
  register,
  resetPassword,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { forgotPasswordRateLimit } from '../middlewares/forgotPasswordRateLimit.js';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.get('/me', requireAuth, me);
authRouter.post('/forgot-password', forgotPasswordRateLimit, forgotPassword);
authRouter.post('/reset-password', resetPassword);
