import { and, desc, eq, or } from 'drizzle-orm';
import { db } from '../config/database.js';
import { orders, shipments, trackingEvents } from '../db/schema.js';
import type { BiteshipWebhookPayload } from '../schemas/biteship.schema.js';

const STATUS_DESCRIPTIONS: Record<string, string> = {
  confirmed: 'Pesanan dikonfirmasi, menunggu penjemputan kurir',
  allocated: 'Kurir telah dialokasikan',
  scheduled: 'Pengiriman dijadwalkan',
  picking_up: 'Kurir menuju lokasi penjemputan',
  picked: 'Paket telah dijemput kurir',
  in_transit: 'Paket dalam perjalanan',
  dropping_off: 'Paket menuju alamat pembeli',
  return_in_transit: 'Paket dalam perjalanan kembali ke pengirim',
  on_hold: 'Pengiriman sedang ditahan sementara',
  delivered: 'Paket telah diterima',
  rejected: 'Pengiriman ditolak oleh kurir',
  courier_not_found: 'Kurir tidak tersedia',
  returned: 'Paket telah dikembalikan ke pengirim',
  cancelled: 'Pengiriman dibatalkan',
  disposed: 'Paket telah dibuang sesuai ketentuan',
};

function normalizeStatus(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

export async function handleBiteshipWebhook(payload: BiteshipWebhookPayload): Promise<void> {
  if (!payload.order_id && !payload.courier_waybill_id) {
    return;
  }

  const [shipment] = await db
    .select()
    .from(shipments)
    .where(
      or(
        payload.order_id === undefined
          ? undefined
          : eq(shipments.biteshipOrderId, payload.order_id),
        payload.courier_waybill_id === undefined
          ? undefined
          : eq(shipments.trackingNumber, payload.courier_waybill_id),
      ),
    )
    .limit(1);

  if (!shipment) {
    return;
  }

  const now = new Date();
  const updates: {
    updatedAt: Date;
    status?: 'Dikirim' | 'Selesai';
    trackingNumber?: string;
    biteshipTrackingId?: string;
    deliveredAt?: Date;
    courierLink?: string;
    actualShippingCost?: number;
    shippingCostDifference?: number;
  } = { updatedAt: now };

  if (payload.courier_waybill_id) {
    updates.trackingNumber = payload.courier_waybill_id;
  }

  if (payload.courier_tracking_id) {
    updates.biteshipTrackingId = payload.courier_tracking_id;
  }

  if (payload.courier_link) {
    updates.courierLink = payload.courier_link;
  }

  if (payload.price !== undefined) {
    const [order] = await db
      .select({ shippingCost: orders.shippingCost })
      .from(orders)
      .where(eq(orders.id, shipment.orderId))
      .limit(1);

    if (order) {
      const actual = Math.round(payload.price);
      updates.actualShippingCost = actual;
      updates.shippingCostDifference = actual - order.shippingCost;
    }
  }

  if (payload.status === 'delivered') {
    updates.status = 'Selesai';
    updates.deliveredAt = shipment.deliveredAt ?? now;
  }

  await db.update(shipments).set(updates).where(eq(shipments.id, shipment.id));

  // Biteship is the source of truth for delivery; finish the order without a worker.
  if (payload.status === 'delivered') {
    await db
      .update(orders)
      .set({ status: 'Selesai', updatedAt: now })
      .where(and(eq(orders.id, shipment.orderId), eq(orders.status, 'Dikirim')));
  }

  const status = normalizeStatus(payload.status ?? payload.event);
  const [latest] = await db
    .select({ status: trackingEvents.status })
    .from(trackingEvents)
    .where(eq(trackingEvents.shipmentId, shipment.id))
    .orderBy(desc(trackingEvents.occurredAt), desc(trackingEvents.id))
    .limit(1);

  if (latest?.status === status) {
    return;
  }

  const driver =
    payload.courier_driver_name || payload.courier_driver_phone
      ? ` (${[payload.courier_driver_name, payload.courier_driver_phone].filter(Boolean).join(' / ')})`
      : '';
  const description = `${STATUS_DESCRIPTIONS[status] ?? `Status pengiriman: ${status}`}${driver}`;

  await db.insert(trackingEvents).values({
    shipmentId: shipment.id,
    status,
    location: 'Biteship',
    description,
    occurredAt: now,
  });
}
