import { and, asc, eq, gte, lt, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { orderItems, orders, returnItems, returns, sellers, type SellerRole } from '../db/schema.js';
import type { SalesReportQuery } from '../schemas/adminReports.schema.js';
import { formatJakartaDate, resolveDateRange, type DateRange } from '../utils/dateRange.js';
import { AppError } from '../utils/httpError.js';

interface SellerSalesRow {
  id: number;
  name: string;
  business: string | null;
  type: string | null;
  role: SellerRole;
  roleTone: string;
  initials: string;
  sold: number;
  total: number;
  refund: number;
  net: number;
  orderCount: number;
  lastSaleAt: string | null;
  date: string | null;
}

interface ProductSalesRow {
  productId: number | null;
  productName: string;
  sku: string | null;
  sold: number;
  total: number;
  refund: number;
  net: number;
  unitPrice: number;
  status: string;
  lastSaleAt: string | null;
  date: string | null;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

async function computeSellerRows(range: DateRange, sellerId?: number): Promise<SellerSalesRow[]> {
  const [sellerRows, salesRows, refundRows] = await Promise.all([
    db
      .select()
      .from(sellers)
      .where(sellerId === undefined ? undefined : eq(sellers.id, sellerId))
      .orderBy(asc(sellers.id)),
    db
      .select({
        sellerId: orderItems.sellerId,
        sold: sql<number>`coalesce(sum(${orderItems.qty}), 0)`.mapWith(Number),
        total: sql<number>`coalesce(sum(${orderItems.subtotal}), 0)`.mapWith(Number),
        orderCount: sql<number>`count(distinct ${orderItems.orderId})`.mapWith(Number),
        lastSaleAt: sql<Date | null>`max(${orders.createdAt})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.paymentStatus, 'paid'),
          gte(orders.createdAt, range.start),
          lt(orders.createdAt, range.endExclusive),
        ),
      )
      .groupBy(orderItems.sellerId),
    db
      .select({
        sellerId: orderItems.sellerId,
        refund: sql<number>`coalesce(sum(${returnItems.qty} * ${orderItems.unitPrice}), 0)`.mapWith(
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
      )
      .groupBy(orderItems.sellerId),
  ]);

  const salesBySeller = new Map(
    salesRows
      .filter((row) => row.sellerId !== null)
      .map((row) => [row.sellerId as number, row]),
  );
  const refundBySeller = new Map(
    refundRows
      .filter((row) => row.sellerId !== null)
      .map((row) => [row.sellerId as number, row.refund]),
  );

  return sellerRows.map((seller) => {
    const sales = salesBySeller.get(seller.id);
    const total = sales?.total ?? 0;
    const refund = refundBySeller.get(seller.id) ?? 0;
    const lastSaleAt = sales?.lastSaleAt ? new Date(sales.lastSaleAt) : null;

    return {
      id: seller.id,
      name: seller.name,
      business: seller.business,
      type: seller.type,
      role: seller.role,
      roleTone: seller.role.toLowerCase(),
      initials: initials(seller.name),
      sold: sales?.sold ?? 0,
      total,
      refund,
      net: total - refund,
      orderCount: sales?.orderCount ?? 0,
      lastSaleAt: lastSaleAt?.toISOString() ?? null,
      date: lastSaleAt ? formatJakartaDate(lastSaleAt) : null,
    };
  });
}

function sumTotals(rows: SellerSalesRow[]) {
  return rows.reduce(
    (acc, row) => ({
      sold: acc.sold + row.sold,
      total: acc.total + row.total,
      refund: acc.refund + row.refund,
      net: acc.net + row.net,
      orderCount: acc.orderCount + row.orderCount,
    }),
    { sold: 0, total: 0, refund: 0, net: 0, orderCount: 0 },
  );
}

export async function listSalesReport(query: SalesReportQuery) {
  const range = resolveDateRange(query.startDate, query.endDate);
  const data = await computeSellerRows(range, query.sellerId);

  if (query.sellerId !== undefined && data.length === 0) {
    throw new AppError(404, 'Penjual tidak ditemukan');
  }

  return {
    data,
    period: {
      startDate: range.startDate,
      endDate: range.endDate,
      timezone: range.timezone,
    },
    totals: sumTotals(data),
  };
}

export async function getSellerReportDetail(sellerId: number, query: SalesReportQuery) {
  const range = resolveDateRange(query.startDate, query.endDate);
  const sellerRows = await computeSellerRows(range, sellerId);

  if (sellerRows.length === 0) {
    throw new AppError(404, 'Penjual tidak ditemukan');
  }

  const seller = sellerRows[0]!;

  const [salesRows, refundRows] = await Promise.all([
    db
      .select({
        productId: orderItems.productId,
        productName: orderItems.productName,
        sku: sql<string | null>`min(${orderItems.variantSku})`,
        sold: sql<number>`coalesce(sum(${orderItems.qty}), 0)`.mapWith(Number),
        total: sql<number>`coalesce(sum(${orderItems.subtotal}), 0)`.mapWith(Number),
        lastSaleAt: sql<Date | null>`max(${orders.createdAt})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.paymentStatus, 'paid'),
          eq(orderItems.sellerId, sellerId),
          gte(orders.createdAt, range.start),
          lt(orders.createdAt, range.endExclusive),
        ),
      )
      .groupBy(orderItems.productId, orderItems.productName),
    db
      .select({
        productId: orderItems.productId,
        productName: orderItems.productName,
        refund: sql<number>`coalesce(sum(${returnItems.qty} * ${orderItems.unitPrice}), 0)`.mapWith(
          Number,
        ),
      })
      .from(returns)
      .innerJoin(returnItems, eq(returnItems.returnId, returns.id))
      .innerJoin(orderItems, eq(orderItems.id, returnItems.orderItemId))
      .where(
        and(
          eq(returns.status, 'Disetujui'),
          eq(orderItems.sellerId, sellerId),
          gte(returns.decisionAt, range.start),
          lt(returns.decisionAt, range.endExclusive),
        ),
      )
      .groupBy(orderItems.productId, orderItems.productName),
  ]);

  const products = new Map<string, ProductSalesRow>();

  for (const row of salesRows) {
    const key = row.productId === null ? row.productName : String(row.productId);
    const lastSaleAt = row.lastSaleAt ? new Date(row.lastSaleAt) : null;
    const refund = refundRows.find(
      (refundRow) =>
        (refundRow.productId === null ? refundRow.productName : String(refundRow.productId)) === key,
    )?.refund ?? 0;

    products.set(key, {
      productId: row.productId,
      productName: row.productName,
      sku: row.sku,
      sold: row.sold,
      total: row.total,
      refund,
      net: row.total - refund,
      unitPrice: row.sold > 0 ? Math.round(row.total / row.sold) : 0,
      status: refund > 0 ? 'Selesai & Sebagian Retur' : 'Selesai',
      lastSaleAt: lastSaleAt?.toISOString() ?? null,
      date: lastSaleAt ? formatJakartaDate(lastSaleAt) : null,
    });
  }

  for (const row of refundRows) {
    const key = row.productId === null ? row.productName : String(row.productId);

    if (!products.has(key)) {
      products.set(key, {
        productId: row.productId,
        productName: row.productName,
        sku: null,
        sold: 0,
        total: 0,
        refund: row.refund,
        net: -row.refund,
        unitPrice: 0,
        status: 'Retur',
        lastSaleAt: null,
        date: null,
      });
    }
  }

  const productList = [...products.values()];
  const totals = productList.reduce(
    (acc, row) => ({
      sold: acc.sold + row.sold,
      total: acc.total + row.total,
      refund: acc.refund + row.refund,
      net: acc.net + row.net,
    }),
    { sold: 0, total: 0, refund: 0, net: 0 },
  );

  return {
    seller,
    period: {
      startDate: range.startDate,
      endDate: range.endDate,
      timezone: range.timezone,
    },
    products: productList,
    totals,
  };
}
