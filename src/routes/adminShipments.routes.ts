import { Router } from 'express';
import {
  create,
  detail,
  list,
  tracking,
} from '../controllers/adminShipments.controller.js';
import { requireAdmin, requireAuth } from '../middlewares/auth.js';

export const adminShipmentsRouter = Router();

adminShipmentsRouter.use(requireAuth, requireAdmin);
adminShipmentsRouter.get('/', list);
adminShipmentsRouter.post('/', create);
adminShipmentsRouter.get('/:id/tracking', tracking);
adminShipmentsRouter.get('/:id', detail);
