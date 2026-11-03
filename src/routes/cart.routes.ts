import { Router } from 'express';
import { addItem, clear, removeItem, show, updateItem } from '../controllers/cart.controller.js';
import { requireAuth } from '../middlewares/auth.js';

export const cartRouter = Router();

cartRouter.use(requireAuth);
cartRouter.get('/', show);
cartRouter.post('/items', addItem);
cartRouter.patch('/items/:productId', updateItem);
cartRouter.delete('/items/:productId', removeItem);
cartRouter.delete('/', clear);
