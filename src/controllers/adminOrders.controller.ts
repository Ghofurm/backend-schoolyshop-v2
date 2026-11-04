import type { Request, Response } from 'express';
import {
  adminOrderIdParamSchema,
  adminOrderListQuerySchema,
  verifyOrderSchema,
} from '../schemas/adminOrders.schema.js';
import {
  getAdminOrderDetail,
  listAdminOrders,
  verifyAdminOrder,
} from '../services/adminOrders.service.js';
import { parseInput } from '../utils/validation.js';

export async function list(req: Request, res: Response): Promise<void> {
  const query = parseInput(adminOrderListQuerySchema, req.query);
  const result = await listAdminOrders(query);

  res.json(result);
}

export async function detail(req: Request, res: Response): Promise<void> {
  const id = parseInput(adminOrderIdParamSchema, req.params.id);
  const order = await getAdminOrderDetail(id);

  res.json(order);
}

export async function verify(req: Request, res: Response): Promise<void> {
  const id = parseInput(adminOrderIdParamSchema, req.params.id);
  const input = parseInput(verifyOrderSchema, req.body);
  const order = await verifyAdminOrder(id, input);

  res.json(order);
}
