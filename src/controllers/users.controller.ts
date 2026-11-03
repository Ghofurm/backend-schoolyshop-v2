import type { Request, Response } from 'express';
import { getAuthUser } from '../middlewares/auth.js';
import { changePasswordSchema, updateProfileSchema } from '../schemas/users.schema.js';
import { getSessionToken } from '../services/auth.service.js';
import { changePassword, updateProfile } from '../services/users.service.js';
import { parseInput } from '../utils/validation.js';

export function getMe(req: Request, res: Response): void {
  res.json(getAuthUser(req));
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const user = getAuthUser(req);
  const input = parseInput(updateProfileSchema, req.body);
  const profile = await updateProfile(user.id, input);

  res.json(profile);
}

export async function updatePassword(req: Request, res: Response): Promise<void> {
  const user = getAuthUser(req);
  const input = parseInput(changePasswordSchema, req.body);

  await changePassword(user.id, input, getSessionToken(req.cookies));
  res.status(204).end();
}
