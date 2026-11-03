import { Router } from 'express';
import { create, list, uploadPhotos } from '../controllers/returns.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { returnPhotosUpload } from '../middlewares/returnPhotosUpload.js';

export const returnsRouter = Router();

returnsRouter.use(requireAuth);
returnsRouter.get('/', list);
returnsRouter.post('/', create);
returnsRouter.post('/:id/photos', returnPhotosUpload, uploadPhotos);
