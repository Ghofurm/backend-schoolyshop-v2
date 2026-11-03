import type { Request, Response } from 'express';
import { getAuthUser } from '../middlewares/auth.js';
import { createPaymentSchema, paymentIdParamSchema } from '../schemas/payments.schema.js';
import { createPayment, getPayment, simulatePayment } from '../services/payments.service.js';
import { parseInput } from '../utils/validation.js';

export async function create(req: Request, res: Response): Promise<void> {
  const input = parseInput(createPaymentSchema, req.body);
  const payment = await createPayment(getAuthUser(req).id, input);

  res.status(201).json(payment);
}

export async function show(req: Request, res: Response): Promise<void> {
  const id = parseInput(paymentIdParamSchema, req.params.id);
  const payment = await getPayment(getAuthUser(req).id, id);

  res.json(payment);
}

export async function simulate(req: Request, res: Response): Promise<void> {
  const id = parseInput(paymentIdParamSchema, req.params.id);
  const payment = await simulatePayment(getAuthUser(req).id, id);

  res.json(payment);
}
