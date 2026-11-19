import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '../schemas/auth.schema.js';
import {
  SESSION_COOKIE,
  authenticateUser,
  createSession,
  deleteSession,
  getSessionToken,
  registerUser,
  requestPasswordReset,
  resetUserPassword,
} from '../services/auth.service.js';
import { parseInput } from '../utils/validation.js';

const isProduction = env.NODE_ENV === 'production';

const baseCookieOptions = {
  httpOnly: true,
  // Cross-site frontend (Vercel) and API (Render) require SameSite=None; Secure.
  sameSite: isProduction ? ('none' as const) : ('lax' as const),
  secure: isProduction,
  path: '/',
};

export async function register(req: Request, res: Response): Promise<void> {
  const input = parseInput(registerSchema, req.body);
  const user = await registerUser(input);

  res.status(201).json(user);
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = parseInput(loginSchema, req.body);
  const user = await authenticateUser(input.email, input.password);
  const { token, expiresAt } = await createSession(user.id, input.rememberMe);

  res.cookie(SESSION_COOKIE, token, { ...baseCookieOptions, expires: expiresAt });
  res.json(user);
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = getSessionToken(req.cookies);

  if (token) {
    await deleteSession(token);
  }

  res.clearCookie(SESSION_COOKIE, baseCookieOptions);
  res.status(204).end();
}

export function me(req: Request, res: Response): void {
  res.json(req.user);
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const input = parseInput(forgotPasswordSchema, req.body);

  await requestPasswordReset(input.email);
  res.status(204).end();
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const input = parseInput(resetPasswordSchema, req.body);

  await resetUserPassword(input.token, input.password);
  res.status(204).end();
}
