import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../utils/httpError.js';
import { validationError } from '../utils/validation.js';

function resolveStatus(error: unknown): number {
  if (typeof error === 'object' && error !== null) {
    const { status, statusCode } = error as { status?: unknown; statusCode?: unknown };
    const candidate = typeof status === 'number' ? status : statusCode;

    if (typeof candidate === 'number' && candidate >= 400 && candidate < 600) {
      return candidate;
    }
  }

  return 500;
}

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return validationError(error);
  }

  const status = resolveStatus(error);
  const fallback = status >= 500 ? 'Internal Server Error' : 'Permintaan tidak dapat diproses';
  const message =
    error instanceof Error && error.message ? error.message : fallback;

  return new AppError(
    status,
    status >= 500 && env.NODE_ENV === 'production' ? 'Internal Server Error' : message,
  );
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, `Route ${req.method} ${req.originalUrl} not found`));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const appError = toAppError(error);

  if (appError.status >= 500 && env.NODE_ENV !== 'test') {
    console.error(error);
  }

  res.status(appError.status).json({
    code: appError.code,
    message: appError.message,
    details: appError.details,
  });
};
