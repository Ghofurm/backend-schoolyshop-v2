import type { Request, RequestHandler } from 'express';
import { findSessionUser, getSessionToken } from '../services/auth.service.js';
import type { UserProfile } from '../services/users.service.js';
import { AppError } from '../utils/httpError.js';

export function getAuthUser(req: Request): UserProfile {
  if (!req.user) {
    throw new AppError(401, 'Silakan login terlebih dahulu');
  }

  return req.user;
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = getSessionToken(req.cookies);

    if (!token) {
      throw new AppError(401, 'Silakan login terlebih dahulu');
    }

    const sessionUser = await findSessionUser(token);

    if (!sessionUser) {
      throw new AppError(401, 'Sesi tidak valid atau sudah berakhir');
    }

    if (sessionUser.status !== 'active') {
      throw new AppError(403, 'Akun tidak aktif', { code: 'ACCOUNT_INACTIVE' });
    }

    req.user = {
      id: sessionUser.id,
      name: sessionUser.name,
      email: sessionUser.email,
      phone: sessionUser.phone,
      role: sessionUser.role,
      createdAt: sessionUser.createdAt,
    };
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = getSessionToken(req.cookies);

    if (token) {
      const sessionUser = await findSessionUser(token);

      if (sessionUser && sessionUser.status === 'active') {
        req.user = {
          id: sessionUser.id,
          name: sessionUser.name,
          email: sessionUser.email,
          phone: sessionUser.phone,
          role: sessionUser.role,
          createdAt: sessionUser.createdAt,
        };
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    next(new AppError(401, 'Silakan login terlebih dahulu'));
    return;
  }

  if (req.user.role !== 'admin') {
    next(new AppError(403, 'Akses ditolak', { code: 'FORBIDDEN' }));
    return;
  }

  next();
};
