import { Router } from 'express';
import { biteship } from '../controllers/webhooks.controller.js';

export const webhooksRouter = Router();

webhooksRouter.post('/biteship', biteship);
