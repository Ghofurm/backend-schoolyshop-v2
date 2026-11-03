import { Router } from 'express';
import { create, list, remove, update } from '../controllers/addresses.controller.js';
import { requireAuth } from '../middlewares/auth.js';

export const addressesRouter = Router();

addressesRouter.use(requireAuth);
addressesRouter.get('/', list);
addressesRouter.post('/', create);
addressesRouter.patch('/:id', update);
addressesRouter.delete('/:id', remove);
