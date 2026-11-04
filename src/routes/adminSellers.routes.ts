import { Router } from 'express';
import { create, list, update } from '../controllers/adminSellers.controller.js';
import { requireAdmin, requireAuth } from '../middlewares/auth.js';

export const adminSellersRouter = Router();

adminSellersRouter.use(requireAuth, requireAdmin);
adminSellersRouter.get('/', list);
adminSellersRouter.post('/', create);
adminSellersRouter.patch('/:id', update);
