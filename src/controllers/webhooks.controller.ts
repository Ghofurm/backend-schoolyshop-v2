import { timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { biteshipWebhookSchema } from '../schemas/biteship.schema.js';
import { midtransWebhookSchema } from '../schemas/midtrans.schema.js';
import { handleBiteshipWebhook } from '../services/biteshipWebhook.service.js';
import { verifyMidtransSignature } from '../services/midtrans.service.js';
import { handleMidtransWebhook } from '../services/midtransWebhook.service.js';
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

export async function midtrans(req: Request, res: Response): Promise<void> {
  const payload = parseInput(midtransWebhookSchema, req.body);

  if (
    !verifyMidtransSignature({
      orderId: payload.order_id,
      statusCode: payload.status_code,
      grossAmount: payload.gross_amount,
      signature: payload.signature_key,
    })
  ) {
    throw new AppError(401, 'Signature Midtrans tidak valid');
  }

  await handleMidtransWebhook(payload);
  res.json({ success: true });
}
