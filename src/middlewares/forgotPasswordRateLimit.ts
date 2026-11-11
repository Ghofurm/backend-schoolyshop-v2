import type { RequestHandler } from 'express';
import { AppError } from '../utils/httpError.js';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;
const MAX_TRACKED_KEYS = 10_000;

interface Attempt {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, Attempt>();

function rateLimitedError(retryAfter: number): AppError {
  return new AppError(429, 'Terlalu banyak permintaan. Coba lagi nanti.', {
    code: 'RATE_LIMITED',
    details: { retryAfter },
  });
}

// shortcut: process-local memory store; move to Redis if the API runs multiple instances.
export const forgotPasswordRateLimit: RequestHandler = (req, res, next) => {
  const now = Date.now();
  const key = req.ip ?? req.socket.remoteAddress ?? 'unknown';

  if (attempts.size >= MAX_TRACKED_KEYS) {
    for (const [trackedKey, attempt] of attempts) {
      if (attempt.resetAt <= now) attempts.delete(trackedKey);
    }

    if (attempts.size >= MAX_TRACKED_KEYS) {
      const retryAfter = Math.ceil(WINDOW_MS / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      next(rateLimitedError(retryAfter));
      return;
    }
  }

  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  if (current.count >= MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    next(rateLimitedError(retryAfter));
    return;
  }

  current.count += 1;
  next();
};
