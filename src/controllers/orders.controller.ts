import type { Request, Response } from 'express';
import { getAuthUser } from '../middlewares/auth.js';
import {
  orderIdParamSchema,
  orderListQuerySchema,
} from '../schemas/orders.schema.js';
import {
  getInvoice,
  getOrder,
  listOrders,
  receiveOrder,
} from '../services/orders.service.js';
import { parseInput } from '../utils/validation.js';

export async function list(req: Request, res: Response): Promise<void> {
  const query = parseInput(orderListQuerySchema, req.query);
  const result = await listOrders(getAuthUser(req).id, query);

  res.json(result);
}

export async function detail(req: Request, res: Response): Promise<void> {
  const id = parseInput(orderIdParamSchema, req.params.id);
  const order = await getOrder(getAuthUser(req).id, id);

  res.json(order);
}

export async function receive(req: Request, res: Response): Promise<void> {
  const id = parseInput(orderIdParamSchema, req.params.id);
  const order = await receiveOrder(getAuthUser(req).id, id);

  res.json(order);
}

export async function invoice(req: Request, res: Response): Promise<void> {
  const id = parseInput(orderIdParamSchema, req.params.id);
  const data = await getInvoice(getAuthUser(req).id, id);

  res.json(data);
}
