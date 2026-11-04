import { Router } from 'express';
import { detail, list, verify } from '../controllers/adminOrders.controller.js';
import { requireAdmin, requireAuth } from '../middlewares/auth.js';

export const adminOrdersRouter = Router();

adminOrdersRouter.use(requireAuth, requireAdmin);
adminOrdersRouter.get('/', list);
adminOrdersRouter.get('/:id', detail);
adminOrdersRouter.post('/:id/verify', verify);
