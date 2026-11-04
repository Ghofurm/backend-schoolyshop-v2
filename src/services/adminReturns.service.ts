import { and, desc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import {
  RETURN_STATUSES,
  orders,
  returnItems,
  returnPhotos,
  returns,
  type Return,
  type ReturnItem,
  type ReturnPhoto,
  type ReturnStatus,
} from '../db/schema.js';
import type {
  AdminReturnListQuery,
  ApproveReturnInput,
  RejectReturnInput,
} from '../schemas/adminReturns.schema.js';
import { AppError } from '../utils/httpError.js';
import { paginate, paginationOffset } from '../utils/pagination.js';

export interface AdminReturnItemView {
  id: number;
  orderItemId: number | null;
  productId: number | null;
  productName: string;
  variantSize: string | null;
  qty: number;
  reason: string;
}

export interface AdminReturnPhotoView {
  id: number;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}

interface AdminReturnRow {
  request: Return;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string | null;
  total: number;
}

function toItemView(item: ReturnItem): AdminReturnItemView {
  return {
    id: item.id,
    orderItemId: item.orderItemId,
    productId: item.productId,
    productName: item.productName,
    variantSize: item.variantSize,
    qty: item.qty,
    reason: item.reason,
  };
}

function toPhotoView(photo: ReturnPhoto): AdminReturnPhotoView {
  return {
    id: photo.id,
    url: photo.url,
    originalName: photo.originalName,
    mimeType: photo.mimeType,
    size: photo.size,
  };
}

function toView(
  row: AdminReturnRow,
  items: ReturnItem[],
  photos: ReturnPhoto[],
) {
  return {
    id: row.request.id,
    orderId: row.request.orderId,
    status: row.request.status,
    submittedAt: row.request.createdAt.toISOString(),
    decisionAt: row.request.decisionAt?.toISOString() ?? null,
    refundMethod: row.request.refundMethod,
    adminNote: row.request.adminNote,
    buyer: {
      name: row.buyerName,
      email: row.buyerEmail,
      phone: row.buyerPhone,
    },
    order: {
      status: row.orderStatus,
      paymentStatus: row.paymentStatus,
      paymentMethod: row.paymentMethod,
      total: row.total,
    },
    items: items.map(toItemView),
    photos: photos.map(toPhotoView),
  };
}

async function loadItems(returnIds: number[]): Promise<Map<number, ReturnItem[]>> {
  const grouped = new Map<number, ReturnItem[]>();

  if (returnIds.length === 0) {
    return grouped;
  }

  const rows = await db
    .select()
    .from(returnItems)
    .where(inArray(returnItems.returnId, returnIds))
    .orderBy(returnItems.id);

  for (const row of rows) {
    const list = grouped.get(row.returnId) ?? [];
    list.push(row);
    grouped.set(row.returnId, list);
  }

  return grouped;
}

async function loadPhotos(returnIds: number[]): Promise<Map<number, ReturnPhoto[]>> {
  const grouped = new Map<number, ReturnPhoto[]>();

  if (returnIds.length === 0) {
    return grouped;
  }

  const rows = await db
    .select()
    .from(returnPhotos)
    .where(inArray(returnPhotos.returnId, returnIds))
    .orderBy(returnPhotos.id);

  for (const row of rows) {
    const list = grouped.get(row.returnId) ?? [];
    list.push(row);
    grouped.set(row.returnId, list);
  }

  return grouped;
}

const returnSelection = {
  request: returns,
  buyerName: orders.buyerName,
  buyerEmail: orders.buyerEmail,
  buyerPhone: orders.buyerPhone,
  orderStatus: orders.status,
  paymentStatus: orders.paymentStatus,
  paymentMethod: orders.paymentMethod,
  total: orders.total,
};

function buildWhere(query: AdminReturnListQuery) {
  const search = query.search ?? query.q;
  const pattern = search === undefined ? undefined : `%${search}%`;
  const numeric = search !== undefined && /^\d+$/.test(search) ? Number(search) : undefined;

  const matchingItemIds =
    pattern === undefined
      ? undefined
      : db
          .select({ id: returnItems.returnId })
          .from(returnItems)
          .where(
            or(
              ilike(returnItems.productName, pattern),
              ilike(returnItems.reason, pattern),
            ),
          );

  return and(
    query.status === undefined ? undefined : eq(returns.status, query.status),
    search === undefined
      ? undefined
      : or(
          ilike(orders.buyerName, pattern as string),
          ilike(orders.buyerEmail, pattern as string),
          numeric === undefined ? undefined : eq(returns.orderId, numeric),
          matchingItemIds === undefined
            ? undefined
            : inArray(returns.id, matchingItemIds),
        ),
  );
}

export async function listAdminReturns(query: AdminReturnListQuery) {
  const where = buildWhere(query);

  const [rows, countRows, summaryRows] = await Promise.all([
    db
      .select(returnSelection)
      .from(returns)
      .innerJoin(orders, eq(returns.orderId, orders.id))
      .where(where)
      .orderBy(desc(returns.createdAt), desc(returns.id))
      .limit(query.perPage)
      .offset(paginationOffset(query)),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(returns)
      .innerJoin(orders, eq(returns.orderId, orders.id))
      .where(where),
    db
      .select({ status: returns.status, total: sql<number>`count(*)`.mapWith(Number) })
      .from(returns)
      .groupBy(returns.status),
  ]);

  const ids = rows.map((row) => row.request.id);
  const [itemsByReturn, photosByReturn] = await Promise.all([loadItems(ids), loadPhotos(ids)]);

  const byStatus = Object.fromEntries(
    RETURN_STATUSES.map((status) => [status, 0]),
  ) as Record<ReturnStatus, number>;
  let totalReturns = 0;

  for (const row of summaryRows) {
    byStatus[row.status] = row.total;
    totalReturns += row.total;
  }

  const data = rows.map((row) =>
    toView(
      row,
      itemsByReturn.get(row.request.id) ?? [],
      photosByReturn.get(row.request.id) ?? [],
    ),
  );

  return {
    ...paginate(data, countRows[0]?.total ?? 0, query),
    summary: {
      total: totalReturns,
      byStatus,
    },
  };
}

export async function getAdminReturnDetail(id: number) {
  const [row] = await db
    .select(returnSelection)
    .from(returns)
    .innerJoin(orders, eq(returns.orderId, orders.id))
    .where(eq(returns.id, id))
    .limit(1);

  if (!row) {
    throw new AppError(404, 'Pengajuan retur tidak ditemukan');
  }

  const [items, photos] = await Promise.all([loadItems([id]), loadPhotos([id])]);

  return toView(row, items.get(id) ?? [], photos.get(id) ?? []);
}

async function assertPending(id: number) {
  const [request] = await db
    .select({ id: returns.id, status: returns.status, orderId: returns.orderId })
    .from(returns)
    .where(eq(returns.id, id))
    .limit(1);

  if (!request) {
    throw new AppError(404, 'Pengajuan retur tidak ditemukan');
  }

  if (request.status !== 'Menunggu Keputusan') {
    throw new AppError(409, 'Pengajuan retur sudah diputuskan', { code: 'CONFLICT' });
  }

  return request;
}

export async function approveAdminReturn(id: number, input: ApproveReturnInput) {
  const request = await assertPending(id);
  const now = new Date();

  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(returns)
      .set({
        status: 'Disetujui',
        decisionAt: now,
        refundMethod: input.refundMethod,
        adminNote: input.adminNote ?? null,
        updatedAt: now,
      })
      .where(and(eq(returns.id, id), eq(returns.status, 'Menunggu Keputusan')))
      .returning({ id: returns.id });

    if (!updated) {
      throw new AppError(409, 'Pengajuan retur sudah diputuskan', { code: 'CONFLICT' });
    }

    await tx
      .update(orders)
      .set({ status: 'Selesai', updatedAt: now })
      .where(and(eq(orders.id, request.orderId), ne(orders.status, 'Dibatalkan')));
  });

  return getAdminReturnDetail(id);
}

export async function rejectAdminReturn(id: number, input: RejectReturnInput) {
  await assertPending(id);
  const now = new Date();

  const [updated] = await db
    .update(returns)
    .set({
      status: 'Ditolak',
      decisionAt: now,
      adminNote: input.adminNote,
      updatedAt: now,
    })
    .where(and(eq(returns.id, id), eq(returns.status, 'Menunggu Keputusan')))
    .returning({ id: returns.id });

  if (!updated) {
    throw new AppError(409, 'Pengajuan retur sudah diputuskan', { code: 'CONFLICT' });
  }

  return getAdminReturnDetail(id);
}
