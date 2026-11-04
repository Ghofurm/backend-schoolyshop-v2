import { asc, eq, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { cartItems, products, shippingRates } from '../db/schema.js';
import { AppError } from '../utils/httpError.js';
import {
  getBiteshipRates,
  isBiteshipEnabled,
  resolveBiteshipRate,
} from './biteship.service.js';

export interface ShippingRateView {
  id: number | string;
  code: string;
  courier: string;
  service: string;
  description: string;
  price: number;
  eta: string;
  badge: string | null;
}

export interface ResolvedShippingRate {
  code: string;
  courier: string;
  service: string;
  eta: string;
  price: number;
}

export function toShippingRateView(rate: {
  id: number;
  code: string;
  courier: string;
  service: string;
  description: string;
  price: number;
  eta: string;
  badge: string | null;
}): ShippingRateView {
  return {
    id: rate.id,
    code: rate.code,
    courier: rate.courier,
    service: rate.service,
    description: rate.description,
    price: rate.price,
    eta: rate.eta,
    badge: rate.badge,
  };
}

export async function cartWeightForUser(userId: number): Promise<number> {
  const [row] = await db
    .select({
      weight: sql<number>`coalesce(sum(${products.weight} * ${cartItems.qty}), 0)`.mapWith(
        Number,
      ),
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId));

  return row?.weight ?? 0;
}

export async function listShippingRates(
  params: {
    destinationAreaId?: string;
    weight?: number;
    courier?: string;
  },
  userId?: number,
): Promise<ShippingRateView[]> {
  if (isBiteshipEnabled() && params.destinationAreaId) {
    const weight = params.weight ?? (userId ? await cartWeightForUser(userId) : 0);
    const couriers = params.courier
      ?.split(',')
      .map((courier) => courier.trim().toLowerCase())
      .filter(Boolean);

    return getBiteshipRates({
      destinationAreaId: params.destinationAreaId,
      weight: weight > 0 ? weight : 1000,
      couriers,
    });
  }

  const rows = await db.select().from(shippingRates).orderBy(asc(shippingRates.id));

  return rows.map(toShippingRateView);
}

export async function resolveCheckoutRate(params: {
  shippingRateId: number | string;
  destinationAreaId: string;
  weight: number;
}): Promise<ResolvedShippingRate> {
  if (typeof params.shippingRateId === 'number') {
    const [rate] = await db
      .select()
      .from(shippingRates)
      .where(eq(shippingRates.id, params.shippingRateId))
      .limit(1);

    if (!rate) {
      throw new AppError(404, 'Tarif pengiriman tidak ditemukan');
    }

    return {
      code: rate.code,
      courier: rate.courier,
      service: rate.service,
      eta: rate.eta,
      price: rate.price,
    };
  }

  if (!isBiteshipEnabled()) {
    throw new AppError(422, 'Tarif pengiriman tidak ditemukan', {
      details: { fields: { shippingRateId: 'Gunakan tarif lokal yang tersedia' } },
    });
  }

  return resolveBiteshipRate(
    params.destinationAreaId,
    Math.max(1, params.weight),
    params.shippingRateId,
  );
}
