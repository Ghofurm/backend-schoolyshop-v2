import { Router } from 'express';
import { detail, list } from '../controllers/adminReports.controller.js';
import { requireAdmin, requireAuth } from '../middlewares/auth.js';

export const adminReportsRouter = Router();

adminReportsRouter.use(requireAuth, requireAdmin);
adminReportsRouter.get('/sales', list);
adminReportsRouter.get('/sales/:sellerId', detail);
