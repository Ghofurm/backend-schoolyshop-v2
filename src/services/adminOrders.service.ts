import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import {
  ORDER_STATUSES,
  orderItems,
  orders,
  payments,
  variants,
  type OrderStatus,
} from '../db/schema.js';
import type {
  AdminOrderListQuery,
  VerifyOrderInput,
} from '../schemas/adminOrders.schema.js';
import { AppError } from '../utils/httpError.js';
import { paginate, paginationOffset } from '../utils/pagination.js';
import { assertTransition, getOrderForAdmin } from './orders.service.js';

interface ItemSummary {
  productName: string;
  itemCount: number;
}

async function loadItemSummaries(orderIds: number[]): Promise<Map<number, ItemSummary>> {
  const summaries = new Map<number, ItemSummary>();

  if (orderIds.length === 0) {
    return summaries;
  }

  const rows = await db
    .select({
      orderId: orderItems.orderId,
      productName: orderItems.productName,
      qty: orderItems.qty,
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds))
    .orderBy(orderItems.id);

  for (const row of rows) {
    const existing = summaries.get(row.orderId);

    if (existing) {
      existing.itemCount += row.qty;
    } else {
      summaries.set(row.orderId, {
        productName: row.productName,
        itemCount: row.qty,
      });
    }
  }

  return summaries;
}

function buildWhere(query: AdminOrderListQuery) {
  const search = query.search ?? query.q;
  const pattern = search === undefined ? undefined : `%${search}%`;
  const numeric = search !== undefined && /^\d+$/.test(search) ? Number(search) : undefined;

  return and(
    query.paymentStatus === undefined
      ? undefined
      : eq(orders.paymentStatus, query.paymentStatus),
    query.orderStatus === undefined ? undefined : eq(orders.status, query.orderStatus),
    search === undefined
      ? undefined
      : or(
          ilike(orders.buyerName, pattern as string),
          ilike(orders.buyerEmail, pattern as string),
          numeric === undefined ? undefined : eq(orders.id, numeric),
        ),
  );
}

export async function listAdminOrders(query: AdminOrderListQuery) {
  const where = buildWhere(query);

  const [rows, countRows, summaryRows] = await Promise.all([
    db
      .select({
        id: orders.id,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        paymentMethod: orders.paymentMethod,
        buyerName: orders.buyerName,
        buyerEmail: orders.buyerEmail,
        buyerPhone: orders.buyerPhone,
        total: orders.total,
        createdAt: orders.createdAt,
        verifiedAt: orders.verifiedAt,
        verificationDecision: orders.verificationDecision,
        verificationReason: orders.verificationReason,
      })
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt), desc(orders.id))
      .limit(query.perPage)
      .offset(paginationOffset(query)),
    db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(orders).where(where),
    db
      .select({ status: orders.status, total: sql<number>`count(*)`.mapWith(Number) })
      .from(orders)
      .groupBy(orders.status),
  ]);

  const summaries = await loadItemSummaries(rows.map((row) => row.id));
  const byStatus = Object.fromEntries(
    ORDER_STATUSES.map((status) => [status, 0]),
  ) as Record<OrderStatus, number>;

  let totalOrders = 0;

  for (const row of summaryRows) {
    byStatus[row.status] = row.total;
    totalOrders += row.total;
  }

  const data = rows.map((row) => ({
    id: row.id,
    status: row.status,
    orderStatus: row.status,
    paymentStatus: row.paymentStatus,
    paymentMethod: row.paymentMethod,
    buyer: {
      name: row.buyerName,
      email: row.buyerEmail,
      phone: row.buyerPhone,
    },
    total: row.total,
    itemCount: summaries.get(row.id)?.itemCount ?? 0,
    productName: summaries.get(row.id)?.productName ?? null,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    verificationDecision: row.verificationDecision,
    verificationReason: row.verificationReason,
    createdAt: row.createdAt.toISOString(),
  }));

  return {
    ...paginate(data, countRows[0]?.total ?? 0, query),
    summary: {
      total: totalOrders,
      byStatus,
    },
  };
}

export async function getAdminOrderDetail(id: number) {
  const order = await getOrderForAdmin(id);
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, id))
    .orderBy(desc(payments.id))
    .limit(1);

  return {
    ...order,
    orderStatus: order.status,
    summary: {
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      total: order.total,
    },
    payment: payment
      ? {
          paymentId: payment.id,
          method: payment.method,
          methodLabel: payment.methodLabel,
          vaNumber: payment.vaNumber,
          amount: payment.amount,
          status: payment.status,
          expiresAt: payment.expiresAt.toISOString(),
          paidAt: payment.paidAt?.toISOString() ?? null,
        }
      : null,
  };
}

export async function verifyAdminOrder(id: number, input: VerifyOrderInput) {
  const now = new Date();

  await db.transaction(async (tx) => {
    const [order] = await tx
      .select({ status: orders.status, paymentStatus: orders.paymentStatus, verifiedAt: orders.verifiedAt })
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) {
      throw new AppError(404, 'Pesanan tidak ditemukan');
    }

    if (order.paymentStatus !== 'paid') {
      throw new AppError(422, 'Pesanan belum lunas', {
        details: { fields: { paymentStatus: 'Pesanan harus sudah lunas sebelum diverifikasi' } },
      });
    }

    if (order.status !== 'Menunggu Verifikasi' || order.verifiedAt !== null) {
      throw new AppError(422, 'Pesanan sudah diverifikasi atau tidak dapat diverifikasi', {
        details: { fields: { status: 'Verifikasi hanya untuk pesanan yang menunggu verifikasi' } },
      });
    }

    if (input.decision === 'approve') {
      assertTransition(order.status, 'Diproses');

      const [updated] = await tx
        .update(orders)
        .set({
          status: 'Diproses',
          verifiedAt: now,
          verificationDecision: 'approve',
          verificationReason: input.reason ?? null,
          updatedAt: now,
        })
        .where(and(eq(orders.id, id), eq(orders.status, 'Menunggu Verifikasi')))
        .returning({ id: orders.id });

      if (!updated) {
        throw new AppError(422, 'Pesanan tidak dapat diverifikasi', {
          details: { fields: { status: 'Status pesanan berubah' } },
        });
      }

      return;
    }

    assertTransition(order.status, 'Dibatalkan');

    const [updated] = await tx
      .update(orders)
      .set({
        status: 'Dibatalkan',
        paymentStatus: 'refunded',
        verifiedAt: now,
        verificationDecision: 'reject',
        verificationReason: input.reason ?? null,
        updatedAt: now,
      })
      .where(and(eq(orders.id, id), eq(orders.status, 'Menunggu Verifikasi')))
      .returning({ id: orders.id });

    if (!updated) {
      throw new AppError(422, 'Pesanan tidak dapat diverifikasi', {
        details: { fields: { status: 'Status pesanan berubah' } },
      });
    }

    const items = await tx
      .select({ variantId: orderItems.variantId, qty: orderItems.qty })
      .from(orderItems)
      .where(eq(orderItems.orderId, id));

    for (const item of items) {
      if (item.variantId !== null) {
        await tx
          .update(variants)
          .set({ stock: sql`${variants.stock} + ${item.qty}` })
          .where(eq(variants.id, item.variantId));
      }
    }

    await tx
      .update(payments)
      .set({ status: 'refunded', updatedAt: now })
      .where(and(eq(payments.orderId, id), eq(payments.status, 'paid')));
  });

  return getAdminOrderDetail(id);
}
