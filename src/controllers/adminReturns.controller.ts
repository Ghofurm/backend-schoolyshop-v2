import type { Request, Response } from 'express';
import {
  adminReturnIdParamSchema,
  adminReturnListQuerySchema,
  approveReturnSchema,
  rejectReturnSchema,
} from '../schemas/adminReturns.schema.js';
import {
  approveAdminReturn,
  getAdminReturnDetail,
  listAdminReturns,
  rejectAdminReturn,
} from '../services/adminReturns.service.js';
import { parseInput } from '../utils/validation.js';

export async function list(req: Request, res: Response): Promise<void> {
  const query = parseInput(adminReturnListQuerySchema, req.query);
  const result = await listAdminReturns(query);

  res.json(result);
}

export async function detail(req: Request, res: Response): Promise<void> {
  const id = parseInput(adminReturnIdParamSchema, req.params.id);
  const request = await getAdminReturnDetail(id);

  res.json(request);
}

export async function approve(req: Request, res: Response): Promise<void> {
  const id = parseInput(adminReturnIdParamSchema, req.params.id);
  const input = parseInput(approveReturnSchema, req.body);
  const request = await approveAdminReturn(id, input);

  res.json(request);
}

export async function reject(req: Request, res: Response): Promise<void> {
  const id = parseInput(adminReturnIdParamSchema, req.params.id);
  const input = parseInput(rejectReturnSchema, req.body);
  const request = await rejectAdminReturn(id, input);

  res.json(request);
}
