import type { Request, Response } from 'express';
import {
  productIdParamSchema,
  productListQuerySchema,
  productSlugParamSchema,
  relatedQuerySchema,
} from '../schemas/products.schema.js';
import {
  getProductBySlug,
  getRelatedProducts,
  listProducts,
} from '../services/products.service.js';
import { parseInput } from '../utils/validation.js';

export async function list(req: Request, res: Response): Promise<void> {
  const query = parseInput(productListQuerySchema, req.query);
  const result = await listProducts(query);

  res.json(result);
}

export async function detail(req: Request, res: Response): Promise<void> {
  const slug = parseInput(productSlugParamSchema, req.params.slug);
  const product = await getProductBySlug(slug);

  res.json(product);
}

export async function related(req: Request, res: Response): Promise<void> {
  const id = parseInput(productIdParamSchema, req.params.id);
  const { limit } = parseInput(relatedQuerySchema, req.query);
  const data = await getRelatedProducts(id, limit);

  res.json({ data });
}
