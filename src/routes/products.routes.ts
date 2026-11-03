import { Router } from 'express';
import { detail, list, related } from '../controllers/products.controller.js';

export const productsRouter = Router();

productsRouter.get('/', list);
productsRouter.get('/:id/related', related);
productsRouter.get('/:slug', detail);
