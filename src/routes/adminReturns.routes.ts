import { Router } from 'express';
import {
  approve,
  detail,
  list,
  reject,
} from '../controllers/adminReturns.controller.js';
import { requireAdmin, requireAuth } from '../middlewares/auth.js';

export const adminReturnsRouter = Router();

adminReturnsRouter.use(requireAuth, requireAdmin);
adminReturnsRouter.get('/', list);
adminReturnsRouter.get('/:id', detail);
adminReturnsRouter.post('/:id/approve', approve);
adminReturnsRouter.post('/:id/reject', reject);
