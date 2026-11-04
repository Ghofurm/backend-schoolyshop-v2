import { timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { biteshipWebhookSchema } from '../schemas/biteship.schema.js';
import { handleBiteshipWebhook } from '../services/biteshipWebhook.service.js';
import { AppError } from '../utils/httpError.js';
import { parseInput } from '../utils/validation.js';

function secretMatches(provided: string | undefined): boolean {
  if (!provided || !env.BITESHIP_WEBHOOK_SECRET) {
    return false;
  }

  const expected = Buffer.from(env.BITESHIP_WEBHOOK_SECRET);
  const actual = Buffer.from(provided);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function biteship(req: Request, res: Response): Promise<void> {
  const provided = req.get(env.BITESHIP_WEBHOOK_HEADER_KEY);

  if (!secretMatches(provided)) {
    throw new AppError(401, 'Webhook tidak terautentikasi');
  }

  const payload = parseInput(biteshipWebhookSchema, req.body);
  await handleBiteshipWebhook(payload);

  res.json({ success: true });
}
