import { Router } from 'express';
import { list } from '../controllers/reviews.controller.js';
import { requireAuth } from '../middlewares/auth.js';

export const reviewsRouter = Router();

reviewsRouter.use(requireAuth);
reviewsRouter.get('/', list);
