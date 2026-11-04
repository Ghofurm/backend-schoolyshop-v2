import { Router } from 'express';
import {
  create,
  list,
  remove,
  update,
} from '../controllers/adminCategories.controller.js';
import { requireAdmin, requireAuth } from '../middlewares/auth.js';

export const adminCategoriesRouter = Router();

adminCategoriesRouter.use(requireAuth, requireAdmin);
adminCategoriesRouter.get('/', list);
adminCategoriesRouter.post('/', create);
adminCategoriesRouter.patch('/:id', update);
adminCategoriesRouter.delete('/:id', remove);
