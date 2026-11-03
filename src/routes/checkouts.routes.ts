import { Router } from 'express';
import { create, show } from '../controllers/checkouts.controller.js';
import { requireAuth } from '../middlewares/auth.js';

export const checkoutsRouter = Router();

checkoutsRouter.use(requireAuth);
checkoutsRouter.post('/', create);
checkoutsRouter.get('/:id', show);
