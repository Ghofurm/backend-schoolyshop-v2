import type { Request, Response } from 'express';
import { getAuthUser } from '../middlewares/auth.js';
import { createReturnSchema, returnIdParamSchema } from '../schemas/returns.schema.js';
import {
  addReturnPhotos,
  createReturn,
  listReturns,
} from '../services/returns.service.js';
import { AppError } from '../utils/httpError.js';
import { parseInput } from '../utils/validation.js';

export async function list(req: Request, res: Response): Promise<void> {
  const data = await listReturns(getAuthUser(req).id);

  res.json({ data });
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = parseInput(createReturnSchema, req.body);
  const data = await createReturn(getAuthUser(req).id, input);

  res.status(201).json(data);
}

export async function uploadPhotos(req: Request, res: Response): Promise<void> {
  const id = parseInput(returnIdParamSchema, req.params.id);
  const files = Array.isArray(req.files) ? req.files : [];

  if (files.length === 0) {
    throw new AppError(422, 'Pilih minimal satu foto', {
      details: { fields: { photos: 'Pilih minimal satu foto untuk diunggah' } },
    });
  }

  const data = await addReturnPhotos(getAuthUser(req).id, id, files);

  res.status(201).json(data);
}
