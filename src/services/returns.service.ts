import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import {
  RETURN_PHOTO_MAX_FILES,
  RETURN_UPLOAD_DIR,
} from '../config/uploads.js';
import {
  orderItems,
  orders,
  returnItems,
  returnPhotos,
  returns,
  type Return,
  type ReturnItem,
  type ReturnPhoto,
  type ReturnStatus,
} from '../db/schema.js';
import type { CreateReturnInput } from '../schemas/returns.schema.js';
import { AppError } from '../utils/httpError.js';
import { isUniqueViolation } from '../utils/postgres.js';

const ACTIVE_RETURN_STATUSES: ReturnStatus[] = ['Menunggu Keputusan', 'Disetujui'];

const PHOTO_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export interface ReturnItemView {
  id: number;
  orderItemId: number | null;
  productId: number | null;
  productName: string;
  variantId: number | null;
  variantSize: string | null;
  qty: number;
  reason: string;
}

export interface ReturnPhotoView {
  id: number;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface ReturnView {
  id: number;
  orderId: number;
  status: ReturnStatus;
  decisionAt: string | null;
  refundMethod: string | null;
  adminNote: string | null;
  submittedAt: string;
  items: ReturnItemView[];
  photos: ReturnPhotoView[];
}

function toItemView(item: ReturnItem): ReturnItemView {
  return {
    id: item.id,
    orderItemId: item.orderItemId,
    productId: item.productId,
    productName: item.productName,
    variantId: item.variantId,
    variantSize: item.variantSize,
    qty: item.qty,
    reason: item.reason,
  };
}

function toPhotoView(photo: ReturnPhoto): ReturnPhotoView {
  return {
    id: photo.id,
    url: photo.url,
    originalName: photo.originalName,
    mimeType: photo.mimeType,
    size: photo.size,
  };
}

function toView(
  request: Return,
  items: ReturnItem[],
  photos: ReturnPhoto[],
): ReturnView {
  return {
    id: request.id,
    orderId: request.orderId,
    status: request.status,
    decisionAt: request.decisionAt?.toISOString() ?? null,
    refundMethod: request.refundMethod,
    adminNote: request.adminNote,
    submittedAt: request.createdAt.toISOString(),
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
    .orderBy(asc(returnItems.id));

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
    .orderBy(asc(returnPhotos.id));

  for (const row of rows) {
    const list = grouped.get(row.returnId) ?? [];
    list.push(row);
    grouped.set(row.returnId, list);
  }

  return grouped;
}

export async function listReturns(userId: number): Promise<ReturnView[]> {
  const rows = await db
    .select()
    .from(returns)
    .where(eq(returns.userId, userId))
    .orderBy(desc(returns.createdAt), desc(returns.id));

  const ids = rows.map((row) => row.id);
  const [itemsByReturn, photosByReturn] = await Promise.all([loadItems(ids), loadPhotos(ids)]);

  return rows.map((row) =>
    toView(row, itemsByReturn.get(row.id) ?? [], photosByReturn.get(row.id) ?? []),
  );
}

async function findReturn(userId: number, returnId: number): Promise<ReturnView> {
  const [row] = await db
    .select()
    .from(returns)
    .where(and(eq(returns.id, returnId), eq(returns.userId, userId)))
    .limit(1);

  if (!row) {
    throw new AppError(404, 'Pengajuan retur tidak ditemukan');
  }

  const [items, photos] = await Promise.all([loadItems([row.id]), loadPhotos([row.id])]);

  return toView(row, items.get(row.id) ?? [], photos.get(row.id) ?? []);
}

export async function createReturn(
  userId: number,
  input: CreateReturnInput,
): Promise<ReturnView> {
  const [order] = await db
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(and(eq(orders.id, input.orderId), eq(orders.userId, userId)))
    .limit(1);

  if (!order) {
    throw new AppError(404, 'Pesanan tidak ditemukan');
  }

  if (order.status !== 'Dikirim' && order.status !== 'Selesai') {
    throw new AppError(422, 'Pesanan belum dapat diretur', {
      details: {
        fields: { orderId: 'Retur hanya untuk pesanan berstatus Dikirim atau Selesai' },
      },
    });
  }

  const [active] = await db
    .select({ id: returns.id })
    .from(returns)
    .where(and(eq(returns.orderId, order.id), inArray(returns.status, ACTIVE_RETURN_STATUSES)))
    .limit(1);

  if (active) {
    throw new AppError(409, 'Pesanan sudah memiliki pengajuan retur aktif', {
      code: 'CONFLICT',
    });
  }

  const orderedItems = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      productName: orderItems.productName,
      variantId: orderItems.variantId,
      variantSize: orderItems.variantSize,
      qty: orderItems.qty,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  const byId = new Map(orderedItems.map((item) => [item.id, item]));
  const byProduct = new Map(
    orderedItems
      .filter((item) => item.productId !== null)
      .map((item) => [item.productId as number, item]),
  );
  const seen = new Set<number>();
  const prepared: Array<{
    orderItemId: number;
    productId: number | null;
    productName: string;
    variantId: number | null;
    variantSize: string | null;
    qty: number;
    reason: string;
  }> = [];

  for (const item of input.items) {
    const ordered =
      item.orderItemId !== undefined
        ? byId.get(item.orderItemId)
        : item.productId !== undefined
          ? byProduct.get(item.productId)
          : undefined;

    if (!ordered) {
      throw new AppError(422, 'Item tidak ditemukan pada pesanan', {
        details: { fields: { items: 'Salah satu item bukan bagian dari pesanan ini' } },
      });
    }

    if (item.qty > ordered.qty) {
      throw new AppError(422, 'Qty retur melebihi jumlah pembelian', {
        details: { fields: { items: `Qty retur ${ordered.productName} maksimal ${ordered.qty}` } },
      });
    }

    if (seen.has(ordered.id)) {
      throw new AppError(422, 'Item retur duplikat', {
        details: { fields: { items: `${ordered.productName} diajukan lebih dari sekali` } },
      });
    }

    seen.add(ordered.id);
    prepared.push({
      orderItemId: ordered.id,
      productId: ordered.productId,
      productName: ordered.productName,
      variantId: ordered.variantId,
      variantSize: ordered.variantSize,
      qty: item.qty,
      reason: item.reason,
    });
  }

  try {
    const returnId = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(returns)
        .values({ userId, orderId: order.id })
        .returning({ id: returns.id });

      if (!created) {
        throw new Error('Failed to create return');
      }

      await tx.insert(returnItems).values(
        prepared.map((item) => ({
          returnId: created.id,
          ...item,
        })),
      );

      return created.id;
    });

    return findReturn(userId, returnId);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, 'Pesanan sudah memiliki pengajuan retur aktif', {
        code: 'CONFLICT',
      });
    }

    throw error;
  }
}

export async function addReturnPhotos(
  userId: number,
  returnId: number,
  files: Express.Multer.File[],
): Promise<ReturnView> {
  const [request] = await db
    .select({ id: returns.id, status: returns.status })
    .from(returns)
    .where(and(eq(returns.id, returnId), eq(returns.userId, userId)))
    .limit(1);

  if (!request) {
    throw new AppError(404, 'Pengajuan retur tidak ditemukan');
  }

  if (request.status !== 'Menunggu Keputusan') {
    throw new AppError(422, 'Pengajuan retur sudah diputuskan', {
      details: { fields: { status: 'Foto hanya bisa diunggah saat menunggu keputusan' } },
    });
  }

  const [photoCount] = await db
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(returnPhotos)
    .where(eq(returnPhotos.returnId, returnId));

  if ((photoCount?.total ?? 0) + files.length > RETURN_PHOTO_MAX_FILES) {
    throw new AppError(422, 'Jumlah foto melebihi batas', {
      details: {
        fields: { photos: `Maksimal ${RETURN_PHOTO_MAX_FILES} foto per pengajuan retur` },
      },
    });
  }

  const directory = path.join(RETURN_UPLOAD_DIR, String(returnId));
  await mkdir(directory, { recursive: true });

  for (const file of files) {
    const extension = PHOTO_EXTENSIONS[file.mimetype];

    if (!extension) {
      throw new AppError(422, 'Format foto tidak didukung', {
        details: { fields: { photos: 'Gunakan foto JPEG, PNG, atau WebP' } },
      });
    }

    const filename = `${randomUUID()}${extension}`;
    await writeFile(path.join(directory, filename), file.buffer);

    await db.insert(returnPhotos).values({
      returnId,
      url: `/uploads/returns/${returnId}/${filename}`,
      originalName: path.basename(file.originalname).slice(0, 255),
      mimeType: file.mimetype,
      size: file.size,
    });
  }

  return findReturn(userId, returnId);
}
