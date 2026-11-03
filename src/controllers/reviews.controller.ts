import type { Request, Response } from 'express';
import { getAuthUser } from '../middlewares/auth.js';
import { orderIdParamSchema } from '../schemas/orders.schema.js';
import { createReviewsSchema } from '../schemas/reviews.schema.js';
import { createReviews, listReviews } from '../services/reviews.service.js';
import { paginationQuerySchema } from '../utils/pagination.js';
import { parseInput } from '../utils/validation.js';

export async function create(req: Request, res: Response): Promise<void> {
  const orderId = parseInput(orderIdParamSchema, req.params.id);
  const input = parseInput(createReviewsSchema, req.body);
  const data = await createReviews(getAuthUser(req).id, orderId, input);

  res.status(201).json({ data });
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = parseInput(paginationQuerySchema, req.query);
  const data = await listReviews(getAuthUser(req).id, query);

  res.json(data);
}
