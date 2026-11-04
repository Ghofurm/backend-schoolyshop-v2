import type { Request, Response } from 'express';
import {
  catalogIdParamSchema,
  createCategorySchema,
  updateCategorySchema,
} from '../schemas/adminCatalog.schema.js';
import {
  createAdminCategory,
  deleteAdminCategory,
  listAdminCategories,
  updateAdminCategory,
} from '../services/adminCategories.service.js';
import { parseInput } from '../utils/validation.js';

export async function list(_req: Request, res: Response): Promise<void> {
  const data = await listAdminCategories();

  res.json({ data });
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = parseInput(createCategorySchema, req.body);
  const category = await createAdminCategory(input);

  res.status(201).json(category);
}

export async function update(req: Request, res: Response): Promise<void> {
  const id = parseInput(catalogIdParamSchema, req.params.id);
  const input = parseInput(updateCategorySchema, req.body);
  const category = await updateAdminCategory(id, input);

  res.json(category);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const id = parseInput(catalogIdParamSchema, req.params.id);

  await deleteAdminCategory(id);
  res.status(204).end();
}
