import type { Request, Response } from 'express';
import { getSessionToken } from '../services/auth.service.js';
import { changePassword, updateProfile } from '../services/users.service.js';
import { changePasswordSchema, updateProfileSchema } from '../schemas/users.schema.js';
import { AppError } from '../utils/httpError.js';
import { parseInput } from '../utils/validation.js';
import type { UserProfile } from '../services/users.service.js';

function currentUser(req: Request): UserProfile {
  if (!req.user) {
    throw new AppError(401, 'Silakan login terlebih dahulu');
  }

  return req.user;
}

export function getMe(req: Request, res: Response): void {
  res.json(currentUser(req));
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);
  const input = parseInput(updateProfileSchema, req.body);
  const profile = await updateProfile(user.id, input);

  res.json(profile);
}

export async function updatePassword(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);
  const input = parseInput(changePasswordSchema, req.body);

  await changePassword(user.id, input, getSessionToken(req.cookies));
  res.status(204).end();
}
