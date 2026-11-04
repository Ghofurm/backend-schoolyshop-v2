import type { Request, Response } from 'express';
import {
  adminSellerListQuerySchema,
  catalogIdParamSchema,
  createSellerSchema,
  updateSellerSchema,
} from '../schemas/adminCatalog.schema.js';
import {
  createAdminSeller,
  listAdminSellers,
  updateAdminSeller,
} from '../services/adminSellers.service.js';
import { parseInput } from '../utils/validation.js';

export async function list(req: Request, res: Response): Promise<void> {
  const query = parseInput(adminSellerListQuerySchema, req.query);
  const result = await listAdminSellers(query);

  res.json(result);
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = parseInput(createSellerSchema, req.body);
  const seller = await createAdminSeller(input);

  res.status(201).json(seller);
}

export async function update(req: Request, res: Response): Promise<void> {
  const id = parseInput(catalogIdParamSchema, req.params.id);
  const input = parseInput(updateSellerSchema, req.body);
  const seller = await updateAdminSeller(id, input);

  res.json(seller);
}
