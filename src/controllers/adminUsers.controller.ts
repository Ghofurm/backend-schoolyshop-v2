import type { Request, Response } from 'express';
import {
  adminUserIdParamSchema,
  adminUserListQuerySchema,
} from '../schemas/adminReports.schema.js';
import { getAdminUser, listAdminUsers } from '../services/adminUsers.service.js';
import { parseInput } from '../utils/validation.js';

export async function list(req: Request, res: Response): Promise<void> {
  const query = parseInput(adminUserListQuerySchema, req.query);
  const result = await listAdminUsers(query);

  res.json(result);
}

export async function detail(req: Request, res: Response): Promise<void> {
  const id = parseInput(adminUserIdParamSchema, req.params.id);
  const user = await getAdminUser(id);

  res.json(user);
}
