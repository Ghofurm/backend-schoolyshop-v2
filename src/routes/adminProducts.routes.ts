import { Router } from 'express';
import {
  create,
  list,
  remove,
  update,
  uploadImage,
} from '../controllers/adminProducts.controller.js';
import { requireAdmin, requireAuth } from '../middlewares/auth.js';
import { productImageUpload } from '../middlewares/productImageUpload.js';

export const adminProductsRouter = Router();

adminProductsRouter.use(requireAuth, requireAdmin);
adminProductsRouter.get('/', list);
adminProductsRouter.post('/', create);
adminProductsRouter.patch('/:id', update);
adminProductsRouter.delete('/:id', remove);
adminProductsRouter.post('/:id/image', productImageUpload, uploadImage);
