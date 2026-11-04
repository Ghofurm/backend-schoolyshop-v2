import { Router } from 'express';
import { track } from '../controllers/shipments.controller.js';
import { requireAuth } from '../middlewares/auth.js';

export const shipmentsRouter = Router();

shipmentsRouter.get('/track', requireAuth, track);
