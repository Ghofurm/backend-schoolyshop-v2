import type { ErrorRequestHandler, RequestHandler } from 'express';
import { env } from '../config/env.js';

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

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const status = resolveStatus(error);
  const message = error instanceof Error ? error.message : 'Internal Server Error';

  if (status >= 500 && env.NODE_ENV !== 'test') {
    console.error(error);
  }

  res.status(status).json({
    status: 'error',
    message: status >= 500 && env.NODE_ENV === 'production' ? 'Internal Server Error' : message,
  });
};
