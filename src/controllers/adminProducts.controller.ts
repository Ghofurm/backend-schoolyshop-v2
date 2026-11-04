import type { Request, Response } from 'express';
import {
  adminProductListQuerySchema,
  catalogIdParamSchema,
  createProductSchema,
  updateProductSchema,
} from '../schemas/adminCatalog.schema.js';
import {
  createAdminProduct,
  deleteAdminProduct,
  listAdminProducts,
  updateAdminProduct,
  updateAdminProductImage,
} from '../services/adminProducts.service.js';
import { AppError } from '../utils/httpError.js';
import { parseInput } from '../utils/validation.js';

export async function list(req: Request, res: Response): Promise<void> {
  const query = parseInput(adminProductListQuerySchema, req.query);
  const result = await listAdminProducts(query);

  res.json(result);
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = parseInput(createProductSchema, req.body);
  const product = await createAdminProduct(input);

  res.status(201).json(product);
}

export async function update(req: Request, res: Response): Promise<void> {
  const id = parseInput(catalogIdParamSchema, req.params.id);
  const input = parseInput(updateProductSchema, req.body);
  const product = await updateAdminProduct(id, input);

  res.json(product);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const id = parseInput(catalogIdParamSchema, req.params.id);

  await deleteAdminProduct(id);
  res.status(204).end();
}

export async function uploadImage(req: Request, res: Response): Promise<void> {
  const id = parseInput(catalogIdParamSchema, req.params.id);

  if (!req.file) {
    throw new AppError(422, 'Pilih gambar produk', {
      details: { fields: { image: 'File gambar wajib diunggah' } },
    });
  }

  const product = await updateAdminProductImage(id, req.file);

  res.status(201).json(product);
}
