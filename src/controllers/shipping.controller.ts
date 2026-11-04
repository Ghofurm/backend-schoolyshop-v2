import type { Request, Response } from 'express';
import {
  shippingAreasQuerySchema,
  shippingRatesQuerySchema,
} from '../schemas/orders.schema.js';
import { isBiteshipEnabled, searchBiteshipAreas } from '../services/biteship.service.js';
import { listShippingRates } from '../services/shipping.service.js';
import { parseInput } from '../utils/validation.js';

export async function list(req: Request, res: Response): Promise<void> {
  const query = parseInput(shippingRatesQuerySchema, req.query);
  const data = await listShippingRates(query, req.user?.id);

  res.json({ data });
}

export async function areas(req: Request, res: Response): Promise<void> {
  const { q } = parseInput(shippingAreasQuerySchema, req.query);
  const data = await searchBiteshipAreas(q);

  res.json({ data, source: isBiteshipEnabled() ? 'biteship' : 'local' });
}
