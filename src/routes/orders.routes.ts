import { Router } from 'express';
import { detail, invoice, list, receive } from '../controllers/orders.controller.js';
import { requireAuth } from '../middlewares/auth.js';

export const ordersRouter = Router();

ordersRouter.use(requireAuth);
ordersRouter.get('/', list);
ordersRouter.get('/:id/invoice', invoice);
ordersRouter.get('/:id', detail);
ordersRouter.post('/:id/receive', receive);
