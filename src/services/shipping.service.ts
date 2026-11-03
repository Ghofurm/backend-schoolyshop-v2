import { asc } from 'drizzle-orm';
import { db } from '../config/database.js';
import { shippingRates, type ShippingRate } from '../db/schema.js';

export function toShippingRateView(rate: ShippingRate) {
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

export async function listShippingRates() {
  const rows = await db.select().from(shippingRates).orderBy(asc(shippingRates.id));

  return rows.map(toShippingRateView);
}
