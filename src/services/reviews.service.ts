import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { orderItems, orders, reviews, type Review } from '../db/schema.js';
import type { ReviewInput } from '../schemas/reviews.schema.js';
import { AppError } from '../utils/httpError.js';
import { isUniqueViolation } from '../utils/postgres.js';
import { paginate, paginationOffset, type PaginationMeta } from '../utils/pagination.js';
import type { PaginationQuery } from '../utils/pagination.js';

export interface ReviewView {
  id: number;
  orderId: number;
  orderItemId: number | null;
  productId: number | null;
  productName: string;
  rating: number;
  comment: string;
  submittedAt: string;
}

function toView(review: Review): ReviewView {
  return {
    id: review.id,
    orderId: review.orderId,
    orderItemId: review.orderItemId,
    productId: review.productId,
    productName: review.productName,
    rating: review.rating,
    comment: review.comment,
    submittedAt: review.createdAt.toISOString(),
  };
}

export async function createReviews(
  userId: number,
  orderId: number,
  input: ReviewInput[],
): Promise<ReviewView[]> {
  const [order] = await db
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);

  if (!order) {
    throw new AppError(404, 'Pesanan tidak ditemukan');
  }

  if (order.status !== 'Selesai') {
    throw new AppError(422, 'Pesanan belum selesai', {
      details: { fields: { orderId: 'Ulasan hanya untuk pesanan berstatus Selesai' } },
    });
  }

  const orderedItems = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      productName: orderItems.productName,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const byProduct = new Map(
    orderedItems
      .filter((item) => item.productId !== null)
      .map((item) => [item.productId as number, item]),
  );
  const seen = new Set<number>();
  const prepared: Array<{
    orderItemId: number;
    productId: number;
    productName: string;
    rating: number;
    comment: string;
  }> = [];

  for (const item of input) {
    const ordered = byProduct.get(item.productId);

    if (!ordered) {
      throw new AppError(422, 'Produk tidak ditemukan pada pesanan', {
        details: { fields: { reviews: 'Salah satu produk bukan bagian dari pesanan ini' } },
      });
    }

    if (seen.has(item.productId)) {
      throw new AppError(422, 'Ulasan duplikat dalam satu permintaan', {
        details: { fields: { reviews: `Produk ${ordered.productName} diulas lebih dari sekali` } },
      });
    }

    seen.add(item.productId);
    prepared.push({
      orderItemId: ordered.id,
      productId: item.productId,
      productName: ordered.productName,
      rating: item.rating,
      comment: item.comment,
    });
  }

  const existing = await db
    .select({ productId: reviews.productId })
    .from(reviews)
    .where(
      and(
        eq(reviews.orderId, orderId),
        inArray(
          reviews.productId,
          prepared.map((item) => item.productId),
        ),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    throw new AppError(409, 'Produk pada pesanan ini sudah diulas', { code: 'CONFLICT' });
  }

  try {
    const created = await db.transaction(async (tx) =>
      tx
        .insert(reviews)
        .values(
          prepared.map((item) => ({
            userId,
            orderId,
            ...item,
          })),
        )
        .returning(),
    );

    return created.map(toView);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, 'Produk pada pesanan ini sudah diulas', { code: 'CONFLICT' });
    }

    throw error;
  }
}

export async function listReviews(
  userId: number,
  query: PaginationQuery,
): Promise<{ data: ReviewView[]; meta: PaginationMeta }> {
  const where = eq(reviews.userId, userId);

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(reviews)
      .where(where)
      .orderBy(desc(reviews.createdAt), desc(reviews.id))
      .limit(query.perPage)
      .offset(paginationOffset(query)),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(reviews)
      .where(where),
  ]);

  return paginate(rows.map(toView), countRows[0]?.total ?? 0, query);
}
