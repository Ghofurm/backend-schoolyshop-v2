import type { Request, Response } from 'express';
import { shippingRatesQuerySchema } from '../schemas/orders.schema.js';
import { listShippingRates } from '../services/shipping.service.js';
import { parseInput } from '../utils/validation.js';

export async function list(req: Request, res: Response): Promise<void> {
  parseInput(shippingRatesQuerySchema, req.query);
  const data = await listShippingRates();

  res.json({ data });
}
