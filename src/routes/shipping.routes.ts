import { Router } from 'express';
import { areas, list } from '../controllers/shipping.controller.js';
import { optionalAuth } from '../middlewares/auth.js';

export const shippingRouter = Router();

shippingRouter.get('/rates', optionalAuth, list);
shippingRouter.get('/areas', areas);
