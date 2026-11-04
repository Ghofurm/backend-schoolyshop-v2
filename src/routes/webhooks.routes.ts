import { Router } from 'express';
import { biteship, midtrans } from '../controllers/webhooks.controller.js';

export const webhooksRouter = Router();

webhooksRouter.post('/biteship', biteship);
webhooksRouter.post('/midtrans', midtrans);
