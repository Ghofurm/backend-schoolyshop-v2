import { Router } from 'express';
import { create, show, simulate } from '../controllers/payments.controller.js';
import { requireAuth } from '../middlewares/auth.js';

export const paymentsRouter = Router();

paymentsRouter.use(requireAuth);
paymentsRouter.post('/', create);
paymentsRouter.get('/:id', show);
paymentsRouter.post('/:id/simulate', simulate);
