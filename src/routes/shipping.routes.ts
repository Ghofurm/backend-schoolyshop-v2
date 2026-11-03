import { Router } from 'express';
import { list } from '../controllers/shipping.controller.js';

export const shippingRouter = Router();

shippingRouter.get('/rates', list);
