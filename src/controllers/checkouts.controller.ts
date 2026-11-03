import type { Request, Response } from 'express';
import { getAuthUser } from '../middlewares/auth.js';
import { checkoutSchema, orderIdParamSchema } from '../schemas/orders.schema.js';
import { createCheckout, getOrder } from '../services/orders.service.js';
import { parseInput } from '../utils/validation.js';

export async function create(req: Request, res: Response): Promise<void> {
  const input = parseInput(checkoutSchema, req.body);
  const result = await createCheckout(getAuthUser(req).id, input);

  res.status(201).json(result);
}

export async function show(req: Request, res: Response): Promise<void> {
  const id = parseInput(orderIdParamSchema, req.params.id);
  const order = await getOrder(getAuthUser(req).id, id);

  res.json(order);
}
