import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { cartRouter } from './cart.routes.js';
import { categoriesRouter } from './categories.routes.js';
import { healthRouter } from './health.routes.js';
import { productsRouter } from './products.routes.js';
import { usersRouter } from './users.routes.js';

export const routes = Router();

routes.use('/health', healthRouter);
routes.use('/auth', authRouter);
routes.use('/users', usersRouter);
routes.use('/products', productsRouter);
routes.use('/categories', categoriesRouter);
routes.use('/cart', cartRouter);
