import { and, desc, eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import { env } from '../config/env.js';
import { orders, payments, type Payment } from '../db/schema.js';
import type { CreatePaymentInput } from '../schemas/payments.schema.js';
import { AppError } from '../utils/httpError.js';
import { isUniqueViolation } from '../utils/postgres.js';
import { cancelOrderForExpiry, expirePendingOrders } from './orders.service.js';
import {
  chargeMidtrans,
  isMidtransEnabled,
  isMidtransProductionEnabled,
} from './midtrans.service.js';

const METHODS = {
  BCA: { code: 'BCA', label: 'Virtual Account BCA', prefix: '8808' },
  BNI: { code: 'BNI', label: 'Virtual Account BNI', prefix: '8809' },
  MANDIRI: { code: 'MANDIRI', label: 'Virtual Account Mandiri', prefix: '8810' },
} as const;

type PaymentMethodCode = keyof typeof METHODS;

export interface PaymentView {
  paymentId: number;
  orderId: number;
  provider: string;
  method: string;
  methodLabel: string;
  vaNumber: string;
  billerCode: string | null;
  amount: number;
  expiresAt: string;
  status: Payment['status'];
  paidAt: string | null;
  createdAt: string;
}

function toView(payment: Payment): PaymentView {
  return {
    paymentId: payment.id,
    orderId: payment.orderId,
    provider: payment.provider,
    method: payment.method,
    methodLabel: payment.methodLabel,
    vaNumber: payment.vaNumber,
    billerCode: payment.billerCode,
    amount: payment.amount,
    expiresAt: payment.expiresAt.toISOString(),
    status: payment.status,
    paidAt: payment.paidAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
  };
}

function resolveMethod(input: string): (typeof METHODS)[PaymentMethodCode] {
  const key = input
    .trim()
    .toUpperCase()
    .replace(/^VIRTUAL ACCOUNT\s+/, '')
    .replace(/_VA$/, '');

  const method = METHODS[key as PaymentMethodCode];

  if (!method) {
    throw new AppError(422, 'Metode pembayaran tidak valid', {
      details: { fields: { method: 'Pilih metode BCA, BNI, atau Mandiri' } },
    });
  }

  return method;
}

function generateVaNumber(prefix: string): string {
  return `${prefix}${Date.now().toString()}${Math.floor(Math.random() * 90 + 10)}`;
}

async function findPayment(userId: number, paymentId: number): Promise<Payment | undefined> {
  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.userId, userId)))
    .limit(1);

  return payment;
}

async function expirePaymentIfNeeded(payment: Payment): Promise<Payment> {
  if (payment.status !== 'pending' || payment.expiresAt.getTime() > Date.now()) {
    return payment;
  }

  await markPaymentExpired(payment.id);

  const [updated] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, payment.id))
    .limit(1);

  return updated ?? payment;
}

export async function markPaymentExpired(paymentId: number): Promise<void> {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!payment || payment.status !== 'pending') {
    return;
  }

  await cancelOrderForExpiry(payment.orderId);
  await db
    .update(payments)
    .set({ status: 'expired', updatedAt: new Date() })
    .where(and(eq(payments.id, paymentId), eq(payments.status, 'pending')));
}

export async function createPayment(
  userId: number,
  input: CreatePaymentInput,
): Promise<PaymentView> {
  await expirePendingOrders(userId);

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, input.orderId), eq(orders.userId, userId)))
    .limit(1);

  if (!order) {
    throw new AppError(404, 'Pesanan tidak ditemukan');
  }

  const [existing] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.orderId, order.id), eq(payments.status, 'pending')))
    .orderBy(desc(payments.id))
    .limit(1);

  if (existing) {
    const refreshed = await expirePaymentIfNeeded(existing);

    if (refreshed.status === 'pending') {
      throw new AppError(409, 'Pesanan sudah memiliki pembayaran aktif', {
        code: 'CONFLICT',
      });
    }
  }

  const [currentOrder] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, order.id))
    .limit(1);

  if (!currentOrder || currentOrder.status !== 'Menunggu Pembayaran') {
    throw new AppError(409, 'Pesanan tidak dapat dibayar', { code: 'CONFLICT' });
  }

  const method = resolveMethod(input.method);

  if (isMidtransEnabled()) {
    const externalOrderId = `SCH-${currentOrder.id}-${Date.now()}`;
    // shortcut: Midtrans charge happens before the DB insert; a DB failure can leave
    // an orphan Midtrans transaction. Add reconciliation if this becomes frequent.
    const charge = await chargeMidtrans({
      externalOrderId,
      amount: currentOrder.total,
      method: method.code,
      customer: {
        name: currentOrder.buyerName,
        email: currentOrder.buyerEmail,
        phone: currentOrder.buyerPhone,
      },
    });

    try {
      const [payment] = await db
        .insert(payments)
        .values({
          orderId: currentOrder.id,
          userId,
          provider: 'midtrans',
          externalOrderId,
          externalId: charge.externalId,
          method: method.code,
          methodLabel: charge.methodLabel,
          vaNumber: charge.vaNumber,
          billerCode: charge.billerCode,
          amount: currentOrder.total,
          expiresAt: charge.expiresAt,
        })
        .returning();

      if (!payment) {
        throw new Error('Failed to create payment');
      }

      await db
        .update(orders)
        .set({
          paymentStatus: 'pending',
          paymentMethod: charge.methodLabel,
          expiresAt: charge.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, currentOrder.id));

      return toView(payment);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(409, 'Pesanan sudah memiliki pembayaran aktif', {
          code: 'CONFLICT',
        });
      }

      throw error;
    }
  }

  try {
    const [payment] = await db
      .insert(payments)
      .values({
        orderId: currentOrder.id,
        userId,
        method: method.code,
        methodLabel: method.label,
        vaNumber: generateVaNumber(method.prefix),
        amount: currentOrder.total,
        expiresAt: currentOrder.expiresAt,
      })
      .returning();

    if (!payment) {
      throw new Error('Failed to create payment');
    }

    await db
      .update(orders)
      .set({
        paymentStatus: 'pending',
        paymentMethod: method.label,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, currentOrder.id));

    return toView(payment);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, 'Pesanan sudah memiliki pembayaran aktif', {
        code: 'CONFLICT',
      });
    }

    throw error;
  }
}

export async function getPayment(userId: number, paymentId: number): Promise<PaymentView> {
  await expirePendingOrders(userId);

  const payment = await findPayment(userId, paymentId);

  if (!payment) {
    throw new AppError(404, 'Pembayaran tidak ditemukan');
  }

  return toView(await expirePaymentIfNeeded(payment));
}

export async function simulatePayment(userId: number, paymentId: number): Promise<PaymentView> {
  if (env.NODE_ENV === 'production' || isMidtransProductionEnabled()) {
    throw new AppError(404, 'Pembayaran tidak ditemukan');
  }

  await expirePendingOrders(userId);

  const payment = await findPayment(userId, paymentId);

  if (!payment) {
    throw new AppError(404, 'Pembayaran tidak ditemukan');
  }

  const refreshed = await expirePaymentIfNeeded(payment);

  if (refreshed.status !== 'pending') {
    throw new AppError(409, 'Pembayaran tidak dapat diproses', {
      code: 'CONFLICT',
    });
  }

  return markPaid(refreshed.id);
}

export async function markPaid(paymentId: number): Promise<PaymentView> {
  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!payment) {
      throw new AppError(404, 'Pembayaran tidak ditemukan');
    }

    if (payment.status !== 'pending' || payment.expiresAt.getTime() <= Date.now()) {
      throw new AppError(409, 'Pembayaran tidak dapat diproses', {
        code: 'CONFLICT',
      });
    }

    const [paid] = await tx
      .update(payments)
      .set({ status: 'paid', paidAt: new Date(), updatedAt: new Date() })
      .where(and(eq(payments.id, paymentId), eq(payments.status, 'pending')))
      .returning();

    if (!paid) {
      throw new AppError(409, 'Pembayaran tidak dapat diproses', {
        code: 'CONFLICT',
      });
    }

    const [order] = await tx
      .update(orders)
      .set({
        status: 'Menunggu Verifikasi',
        paymentStatus: 'paid',
        paymentMethod: payment.methodLabel,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, payment.orderId), eq(orders.status, 'Menunggu Pembayaran')))
      .returning({ id: orders.id });

    if (!order) {
      throw new AppError(409, 'Status pesanan tidak dapat diproses', {
        code: 'CONFLICT',
      });
    }

    return toView(paid);
  });
}
