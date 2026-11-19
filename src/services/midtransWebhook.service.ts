import { eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import { payments } from '../db/schema.js';
import type { MidtransWebhookPayload } from '../schemas/midtrans.schema.js';
import { AppError } from '../utils/httpError.js';
import { markLateSettlement, markPaid, markPaymentExpired } from './payments.service.js';
import { isMidtransTransactionPaid } from './midtrans.service.js';

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
      return;
    }

    // Late settlement after expiry: confirm with Midtrans, then flag a manual refund.
    if (payment.status === 'expired') {
      const confirmed = await isMidtransTransactionPaid(
        payment.externalOrderId ?? payload.order_id,
      );

      if (confirmed) {
        await markLateSettlement(payment.id);
      }
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
    const partial = status === 'partial_refund' || status === 'partial_chargeback';
    const nextStatus = partial ? 'partial_refund' : 'refunded';
    const parsedRefund = Number(payload.refund_amount);
    const refundAmount =
      Number.isFinite(parsedRefund) && parsedRefund > 0
        ? Math.round(parsedRefund)
        : partial
          ? null
          : payment.amount;

    if (payment.status !== nextStatus || payment.refundAmount !== refundAmount) {
      await db
        .update(payments)
        .set({
          status: nextStatus,
          refundAmount,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));
    }
    return;
  }

  // pending and other transitional statuses require no local mutation.
}
