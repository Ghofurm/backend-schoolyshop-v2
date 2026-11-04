import { eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import { payments } from '../db/schema.js';
import type { MidtransWebhookPayload } from '../schemas/midtrans.schema.js';
import { AppError } from '../utils/httpError.js';
import { markPaid, markPaymentExpired } from './payments.service.js';

export async function handleMidtransWebhook(
  payload: MidtransWebhookPayload,
): Promise<void> {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.externalOrderId, payload.order_id))
    .limit(1);

  if (!payment) {
    return;
  }

  const grossAmount = Number(payload.gross_amount);

  if (!Number.isFinite(grossAmount) || Math.abs(grossAmount - payment.amount) > 0.01) {
    throw new AppError(400, 'Nominal pembayaran tidak sesuai', { code: 'VALIDATION' });
  }

  const status = payload.transaction_status;
  const paid =
    status === 'settlement' ||
    (status === 'capture' && (payload.fraud_status ?? 'accept') === 'accept');

  if (paid) {
    if (payment.status === 'pending') {
      await markPaid(payment.id);
    }
    return;
  }

  if (['expire', 'cancel', 'deny', 'failure'].includes(status)) {
    if (payment.status === 'pending') {
      await markPaymentExpired(payment.id);
    }
    return;
  }

  if (['refund', 'partial_refund', 'chargeback', 'partial_chargeback'].includes(status)) {
    if (payment.status !== 'refunded') {
      await db
        .update(payments)
        .set({ status: 'refunded', updatedAt: new Date() })
        .where(eq(payments.id, payment.id));
    }
    return;
  }

  // pending and other transitional statuses require no local mutation.
}
