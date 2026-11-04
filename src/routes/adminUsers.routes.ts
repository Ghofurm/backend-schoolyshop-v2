import { Router } from 'express';
import { detail, list } from '../controllers/adminUsers.controller.js';
import { requireAdmin, requireAuth } from '../middlewares/auth.js';

export const adminUsersRouter = Router();

adminUsersRouter.use(requireAuth, requireAdmin);
adminUsersRouter.get('/', list);
adminUsersRouter.get('/:id', detail);
