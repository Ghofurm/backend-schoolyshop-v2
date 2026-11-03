import { Router } from 'express';
import { getMe, updateMe, updatePassword } from '../controllers/users.controller.js';
import { requireAuth } from '../middlewares/auth.js';

export const usersRouter = Router();

usersRouter.get('/me', requireAuth, getMe);
usersRouter.patch('/me', requireAuth, updateMe);
usersRouter.patch('/me/password', requireAuth, updatePassword);
