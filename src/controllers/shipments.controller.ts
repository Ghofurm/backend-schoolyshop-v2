import type { Request, Response } from 'express';
import { getAuthUser } from '../middlewares/auth.js';
import { trackShipmentQuerySchema } from '../schemas/shipments.schema.js';
import { trackShipment } from '../services/shipments.service.js';
import { parseInput } from '../utils/validation.js';

export async function track(req: Request, res: Response): Promise<void> {
  const { q } = parseInput(trackShipmentQuerySchema, req.query);
  const user = getAuthUser(req);
  const result = await trackShipment(user.id, user.role === 'admin', q);

  res.json(result);
}
