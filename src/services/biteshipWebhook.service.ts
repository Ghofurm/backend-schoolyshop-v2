import { desc, eq, or } from 'drizzle-orm';
import { db } from '../config/database.js';
import { shipments, trackingEvents } from '../db/schema.js';
import type { BiteshipWebhookPayload } from '../schemas/biteship.schema.js';

const STATUS_DESCRIPTIONS: Record<string, string> = {
  confirmed: 'Pesanan dikonfirmasi, menunggu penjemputan kurir',
  allocated: 'Kurir telah dialokasikan',
  pickingUp: 'Kurir menuju lokasi penjemputan',
  picked: 'Paket telah dijemput kurir',
  inTransit: 'Paket dalam perjalanan',
  droppingOff: 'Paket menuju alamat pembeli',
  returnInTransit: 'Paket dalam perjalanan kembali ke pengirim',
  onHold: 'Pengiriman sedang ditahan sementara',
  delivered: 'Paket telah diterima',
  rejected: 'Pengiriman ditolak oleh kurir',
  courierNotFound: 'Kurir tidak tersedia',
  returned: 'Paket telah dikembalikan ke pengirim',
  cancelled: 'Pengiriman dibatalkan',
  disposed: 'Paket telah dibuang sesuai ketentuan',
};

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
  } = { updatedAt: now };

  if (payload.courier_waybill_id) {
    updates.trackingNumber = payload.courier_waybill_id;
  }

  if (payload.courier_tracking_id) {
    updates.biteshipTrackingId = payload.courier_tracking_id;
  }

  if (payload.status === 'delivered') {
    updates.status = 'Selesai';
  }

  await db.update(shipments).set(updates).where(eq(shipments.id, shipment.id));

  const status = payload.status ?? payload.event;
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
