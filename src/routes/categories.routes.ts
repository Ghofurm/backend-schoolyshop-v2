import { Router } from 'express';
import { list } from '../controllers/categories.controller.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', list);
