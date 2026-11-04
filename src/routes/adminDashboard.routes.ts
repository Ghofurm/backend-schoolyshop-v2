import { Router } from 'express';
import { summary } from '../controllers/adminDashboard.controller.js';
import { requireAdmin, requireAuth } from '../middlewares/auth.js';

export const adminDashboardRouter = Router();

adminDashboardRouter.use(requireAuth, requireAdmin);
adminDashboardRouter.get('/summary', summary);
