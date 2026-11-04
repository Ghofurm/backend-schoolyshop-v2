import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import { db } from '../config/database.js';
import {
  orderItems,
  orders,
  shipments,
  shippingRates,
  trackingEvents,
  type AdminShipmentStatus,
} from '../db/schema.js';
import type {
  AdminShipmentListQuery,
  CreateShipmentInput,
} from '../schemas/shipments.schema.js';
import { AppError } from '../utils/httpError.js';
import { isUniqueViolation } from '../utils/postgres.js';
import { paginate, paginationOffset } from '../utils/pagination.js';
import { assertTransition } from './orders.service.js';

export interface AdminShipmentListItem {
  id: number | null;
  orderId: number;
  customerName: string;
  recipientName: string;
  productName: string | null;
  itemCount: number;
  total: number;
  courier: string | null;
  service: string | null;
  trackingNumber: string | null;
  status: AdminShipmentStatus;
  orderStatus: string;
  shippedAt: string | null;
  createdAt: string;
}

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
    .orderBy(asc(orderItems.id));

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

function composeAddress(address: {
  address: string | null;
  district: string;
  city: string;
  province: string;
}): string {
  return [address.address, address.district, address.city, address.province]
    .filter(Boolean)
    .join(', ');
}

export async function listAdminShipments(
  query: AdminShipmentListQuery,
) {
  const search = query.search ?? query.q;
  const pattern = search === undefined ? undefined : `%${search}%`;
  const includeReady = (query.status === undefined || query.status === 'Siap Dikirim') && !query.courier;

  const readyRows = includeReady
    ? await db
        .select({
          orderId: orders.id,
          customerName: orders.buyerName,
          recipientName: orders.recipientName,
          total: orders.total,
          orderStatus: orders.status,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .leftJoin(shipments, eq(shipments.orderId, orders.id))
        .where(
          and(
            eq(orders.status, 'Diproses'),
            isNull(shipments.id),
            pattern === undefined
              ? undefined
              : or(
                  ilike(orders.recipientName, pattern),
                  ilike(orders.buyerName, pattern),
                ),
          ),
        )
    : [];

  const shipmentRows =
    query.status === 'Siap Dikirim'
      ? []
      : await db
          .select({
            id: shipments.id,
            orderId: shipments.orderId,
            customerName: orders.buyerName,
            recipientName: shipments.recipientName,
            total: orders.total,
            courier: shipments.courier,
            service: shipments.service,
            trackingNumber: shipments.trackingNumber,
            status: shipments.status,
            orderStatus: orders.status,
            shippedAt: shipments.shippedAt,
            createdAt: shipments.createdAt,
          })
          .from(shipments)
          .innerJoin(orders, eq(shipments.orderId, orders.id))
          .where(
            and(
              query.status === undefined
                ? undefined
                : eq(shipments.status, query.status),
              query.courier === undefined
                ? undefined
                : ilike(shipments.courier, `%${query.courier}%`),
              pattern === undefined
                ? undefined
                : or(
                    ilike(shipments.trackingNumber, pattern),
                    ilike(shipments.recipientName, pattern),
                  ),
            ),
          );

  const orderIds = [
    ...readyRows.map((row) => row.orderId),
    ...shipmentRows.map((row) => row.orderId),
  ];
  const summaries = await loadItemSummaries(orderIds);

  const merged: AdminShipmentListItem[] = [
    ...readyRows.map((row) => ({
      id: null,
      orderId: row.orderId,
      customerName: row.customerName,
      recipientName: row.recipientName,
      productName: summaries.get(row.orderId)?.productName ?? null,
      itemCount: summaries.get(row.orderId)?.itemCount ?? 0,
      total: row.total,
      courier: null,
      service: null,
      trackingNumber: null,
      status: 'Siap Dikirim' as const,
      orderStatus: row.orderStatus,
      shippedAt: null,
      createdAt: row.createdAt.toISOString(),
    })),
    ...shipmentRows.map((row) => ({
      id: row.id,
      orderId: row.orderId,
      customerName: row.customerName,
      recipientName: row.recipientName,
      productName: summaries.get(row.orderId)?.productName ?? null,
      itemCount: summaries.get(row.orderId)?.itemCount ?? 0,
      total: row.total,
      courier: row.courier,
      service: row.service,
      trackingNumber: row.trackingNumber,
      status: row.status,
      orderStatus: row.orderStatus,
      shippedAt: row.shippedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const start = paginationOffset(query);

  return paginate(merged.slice(start, start + query.perPage), merged.length, query);
}

async function findShipment(id: number) {
  const [row] = await db
    .select({
      shipment: shipments,
      order: orders,
    })
    .from(shipments)
    .innerJoin(orders, eq(shipments.orderId, orders.id))
    .where(eq(shipments.id, id))
    .limit(1);

  return row;
}

export async function getAdminShipment(id: number) {
  const row = await findShipment(id);

  if (!row) {
    throw new AppError(404, 'Pengiriman tidak ditemukan');
  }

  const items = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      productName: orderItems.productName,
      productImage: orderItems.productImage,
      variantSize: orderItems.variantSize,
      qty: orderItems.qty,
      unitPrice: orderItems.unitPrice,
      subtotal: orderItems.subtotal,
      sellerName: orderItems.sellerName,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, row.order.id))
    .orderBy(asc(orderItems.id));

  const shipping = {
    label: row.order.shippingLabel,
    recipientName: row.shipment.recipientName,
    phone: row.shipment.phone,
    address: row.shipment.address,
    areaId: row.shipment.areaId,
    district: row.shipment.district,
    city: row.shipment.city,
    province: row.shipment.province,
    postalCode: row.shipment.postalCode,
    note: row.shipment.note,
  };

  return {
    id: row.shipment.id,
    orderId: row.shipment.orderId,
    status: row.shipment.status,
    orderStatus: row.order.status,
    trackingNumber: row.shipment.trackingNumber,
    courierCode: row.shipment.courierCode,
    courier: row.shipment.courier,
    service: row.shipment.service,
    shippedAt: row.shipment.shippedAt.toISOString(),
    customerName: row.order.buyerName,
    customerEmail: row.order.buyerEmail,
    customerPhone: row.order.buyerPhone,
    recipientName: row.shipment.recipientName,
    phone: row.shipment.phone,
    address: composeAddress(shipping),
    shipping,
    total: row.order.total,
    itemCount: items.reduce((sum, item) => sum + item.qty, 0),
    productName: items[0]?.productName ?? null,
    items,
  };
}

export async function getAdminShipmentTracking(id: number) {
  const row = await findShipment(id);

  if (!row) {
    throw new AppError(404, 'Pengiriman tidak ditemukan');
  }

  const events = await db
    .select()
    .from(trackingEvents)
    .where(eq(trackingEvents.shipmentId, id))
    .orderBy(desc(trackingEvents.occurredAt), desc(trackingEvents.id));

  return events.map((event) => ({
    id: event.id,
    status: event.status,
    location: event.location,
    description: event.description,
    occurredAt: event.occurredAt.toISOString(),
  }));
}

export async function trackShipment(userId: number, isAdmin: boolean, query: string) {
  const numeric = /^\d+$/.test(query) ? Number(query) : undefined;

  const [row] = await db
    .select({
      shipment: shipments,
      order: orders,
    })
    .from(shipments)
    .innerJoin(orders, eq(shipments.orderId, orders.id))
    .where(
      or(
        ilike(shipments.trackingNumber, query),
        numeric === undefined ? undefined : eq(shipments.orderId, numeric),
      ),
    )
    .limit(1);

  if (!row || (!isAdmin && row.order.userId !== userId)) {
    throw new AppError(404, 'Pengiriman tidak ditemukan');
  }

  const events = await db
    .select()
    .from(trackingEvents)
    .where(eq(trackingEvents.shipmentId, row.shipment.id))
    .orderBy(desc(trackingEvents.occurredAt), desc(trackingEvents.id));

  return {
    orderId: row.shipment.orderId,
    orderStatus: row.order.status,
    courier: row.shipment.courier,
    service: row.shipment.service,
    trackingNumber: row.shipment.trackingNumber,
    status: row.shipment.status,
    recipientName: row.shipment.recipientName,
    shippingAddress: composeAddress({
      address: row.shipment.address,
      district: row.shipment.district,
      city: row.shipment.city,
      province: row.shipment.province,
    }),
    history: events.map((event) => ({
      id: event.id,
      status: event.status,
      location: event.location,
      description: event.description,
      occurredAt: event.occurredAt.toISOString(),
    })),
  };
}

async function resolveRate(input: CreateShipmentInput) {
  if (input.shippingRateId !== undefined) {
    const [rate] = await db
      .select()
      .from(shippingRates)
      .where(eq(shippingRates.id, input.shippingRateId))
      .limit(1);

    if (!rate) {
      throw new AppError(404, 'Tarif pengiriman tidak ditemukan');
    }

    return rate;
  }

  const rates = await db.select().from(shippingRates);
  const needle = (input.courier ?? '').toUpperCase();
  const serviceNeedle = input.service?.toUpperCase();

  const rate = rates.find((item) => {
    const courier = item.courier.toUpperCase();
    const service = item.service.toUpperCase();
    const matchesCourier =
      needle.includes(courier) ||
      courier.includes(needle) ||
      item.code.toUpperCase() === needle;
    const matchesService =
      serviceNeedle === undefined ||
      service.includes(serviceNeedle) ||
      needle.includes(service);

    return matchesCourier && matchesService;
  });

  if (!rate) {
    throw new AppError(422, 'Kurir tidak ditemukan', {
      details: { fields: { courier: 'Pilih kurir/layanan dari daftar tarif pengiriman' } },
    });
  }

  return rate;
}

function trackingPrefix(courier: string): string {
  const normalized = courier.toUpperCase();

  if (normalized.includes('JNE')) return 'JNE';
  if (normalized.includes('SICEPAT')) return 'SC';
  if (normalized.includes('J&T') || normalized.includes('JT')) return 'JT';
  if (normalized.includes('ANTERAJA')) return 'AJ';

  return 'TRK';
}

function generateTrackingNumber(courier: string, shipmentId: number): string {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');

  return `${trackingPrefix(courier)}${stamp}${String(shipmentId).padStart(4, '0')}`;
}

export async function createShipment(input: CreateShipmentInput) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, input.orderId))
    .limit(1);

  if (!order) {
    throw new AppError(404, 'Pesanan tidak ditemukan');
  }

  const [existing] = await db
    .select({ id: shipments.id })
    .from(shipments)
    .where(eq(shipments.orderId, order.id))
    .limit(1);

  if (existing) {
    throw new AppError(409, 'Pesanan sudah memiliki pengiriman', { code: 'CONFLICT' });
  }

  assertTransition(order.status, 'Dikirim');

  const rate = await resolveRate(input);
  const now = new Date();

  try {
    const shipmentId = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(shipments)
        .values({
          orderId: order.id,
          courierCode: rate.code,
          courier: rate.courier,
          service: rate.service,
          trackingNumber: `TMP-${randomUUID()}`,
          recipientName: order.recipientName,
          phone: order.shippingPhone,
          address: order.shippingAddress,
          areaId: order.shippingAreaId,
          district: order.shippingDistrict,
          city: order.shippingCity,
          province: order.shippingProvince,
          postalCode: order.shippingPostalCode,
          note: order.shippingNote,
          shippedAt: now,
        })
        .returning({ id: shipments.id });

      if (!created) {
        throw new Error('Failed to create shipment');
      }

      const trackingNumber = generateTrackingNumber(rate.courier, created.id);
      await tx
        .update(shipments)
        .set({ trackingNumber })
        .where(eq(shipments.id, created.id));

      const [updatedOrder] = await tx
        .update(orders)
        .set({ status: 'Dikirim', updatedAt: now })
        .where(and(eq(orders.id, order.id), eq(orders.status, 'Diproses')))
        .returning({ id: orders.id });

      if (!updatedOrder) {
        throw new AppError(422, 'Status pesanan tidak dapat dikirim', {
          details: { fields: { status: 'Pesanan harus berstatus Diproses' } },
        });
      }

      await tx.insert(trackingEvents).values({
        shipmentId: created.id,
        status: 'Dikirim',
        location: 'Koperasi Sekolah',
        description: `Paket diserahkan ke ${rate.courier} ${rate.service}`,
        occurredAt: now,
      });

      return created.id;
    });

    return getAdminShipment(shipmentId);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, 'Pesanan sudah memiliki pengiriman', { code: 'CONFLICT' });
    }

    throw error;
  }
}
