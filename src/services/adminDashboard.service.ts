import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { orderItems, orders, products, returnItems, returns, users } from '../db/schema.js';
import type { ReportDateQuery } from '../schemas/adminReports.schema.js';
import { resolveDateRange } from '../utils/dateRange.js';

export async function getDashboardSummary(query: ReportDateQuery) {
  const range = resolveDateRange(query.startDate, query.endDate);

  const [
    productRows,
    userRows,
    orderRows,
    paidRows,
    revenueRows,
    refundRows,
    recentRows,
  ] = await Promise.all([
    db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(products),
    db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(users),
    db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(orders),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(orders)
      .where(eq(orders.paymentStatus, 'paid')),
    db
      .select({ total: sql<number>`coalesce(sum(${orders.total}), 0)`.mapWith(Number) })
      .from(orders)
      .where(
        and(
          eq(orders.paymentStatus, 'paid'),
          gte(orders.createdAt, range.start),
          lt(orders.createdAt, range.endExclusive),
        ),
      ),
    db
      .select({
        total: sql<number>`coalesce(sum(${returnItems.qty} * ${orderItems.unitPrice}), 0)`.mapWith(
          Number,
        ),
      })
      .from(returns)
      .innerJoin(returnItems, eq(returnItems.returnId, returns.id))
      .innerJoin(orderItems, eq(orderItems.id, returnItems.orderItemId))
      .where(
        and(
          eq(returns.status, 'Disetujui'),
          gte(returns.decisionAt, range.start),
          lt(returns.decisionAt, range.endExclusive),
        ),
      ),
    db
      .select({
        id: orders.id,
        buyerName: orders.buyerName,
        buyerEmail: orders.buyerEmail,
        total: orders.total,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt), desc(orders.id))
      .limit(5),
  ]);

  const recentIds = recentRows.map((row) => row.id);
  const itemRows =
    recentIds.length === 0
      ? []
      : await db
          .select({
            orderId: orderItems.orderId,
            productName: orderItems.productName,
            qty: orderItems.qty,
          })
          .from(orderItems)
          .where(inArray(orderItems.orderId, recentIds))
          .orderBy(orderItems.id);

  const itemSummaries = new Map<number, { productName: string; itemCount: number }>();

  for (const row of itemRows) {
    const existing = itemSummaries.get(row.orderId);

    if (existing) {
      existing.itemCount += row.qty;
    } else {
      itemSummaries.set(row.orderId, {
        productName: row.productName,
        itemCount: row.qty,
      });
    }
  }

  const grossRevenue = revenueRows[0]?.total ?? 0;
  const totalRefunds = refundRows[0]?.total ?? 0;

  return {
    period: {
      startDate: range.startDate,
      endDate: range.endDate,
      timezone: range.timezone,
    },
    totalProducts: productRows[0]?.total ?? 0,
    totalOrders: orderRows[0]?.total ?? 0,
    totalUsers: userRows[0]?.total ?? 0,
    totalTransactions: paidRows[0]?.total ?? 0,
    grossRevenue,
    totalRefunds,
    totalRevenue: grossRevenue - totalRefunds,
    recentOrders: recentRows.map((row) => ({
      id: row.id,
      buyerName: row.buyerName,
      buyerEmail: row.buyerEmail,
      total: row.total,
      status: row.status,
      paymentStatus: row.paymentStatus,
      productName: itemSummaries.get(row.id)?.productName ?? null,
      itemCount: itemSummaries.get(row.id)?.itemCount ?? 0,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
