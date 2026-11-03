import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import {
  addresses,
  cartItems,
  orderItems,
  orders,
  payments,
  products,
  sellers,
  shippingRates,
  users,
  variants,
  type Order,
  type OrderItem,
  type OrderStatus,
  type PaymentStatus,
  type SellerRole,
} from '../db/schema.js';
import type { CheckoutInput, OrderListQuery } from '../schemas/orders.schema.js';
import { AppError } from '../utils/httpError.js';
import { paginate, paginationOffset, type PaginationMeta } from '../utils/pagination.js';

const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

// Receive closes an order from any still-active status until the payment/shipment
// flows land; final states cannot be changed again.
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  'Menunggu Pembayaran': ['Diproses', 'Dibatalkan', 'Selesai'],
  Diproses: ['Dikirim', 'Selesai'],
  Dikirim: ['Selesai', 'Dalam Pengembalian'],
  'Dalam Pengembalian': ['Selesai'],
  Selesai: [],
  Dibatalkan: [],
};

export interface SellerSummary {
  id: number | null;
  label: string;
  role: SellerRole;
}

export interface OrderItemView {
  id: number;
  productId: number | null;
  productSlug: string;
  productName: string;
  productImage: string | null;
  variantId: number | null;
  variantSku: string | null;
  variantSize: string | null;
  seller: SellerSummary;
  unitPrice: number;
  priceAdjustment: number;
  qty: number;
  subtotal: number;
}

export interface OrderView {
  id: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  subtotal: number;
  shippingCost: number;
  total: number;
  buyer: {
    name: string;
    email: string;
    phone: string;
  };
  shipping: {
    label: string | null;
    recipientName: string;
    phone: string;
    address: string | null;
    areaId: string;
    district: string;
    city: string;
    province: string;
    postalCode: string;
    note: string | null;
  };
  courier: {
    code: string;
    name: string;
    service: string;
    eta: string;
  };
  items: OrderItemView[];
  sellers: SellerSummary[];
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!VALID_TRANSITIONS[from].includes(to)) {
    throw new AppError(422, 'Transisi status pesanan tidak sah', {
      details: { fields: { status: `Tidak dapat mengubah status dari ${from} ke ${to}` } },
    });
  }
}

function toItemView(item: OrderItem): OrderItemView {
  return {
    id: item.id,
    productId: item.productId,
    productSlug: item.productSlug,
    productName: item.productName,
    productImage: item.productImage,
    variantId: item.variantId,
    variantSku: item.variantSku,
    variantSize: item.variantSize,
    seller: {
      id: item.sellerId,
      label: item.sellerName,
      role: item.sellerRole,
    },
    unitPrice: item.unitPrice,
    priceAdjustment: item.priceAdjustment,
    qty: item.qty,
    subtotal: item.subtotal,
  };
}

function toView(order: Order, items: OrderItem[]): OrderView {
  const sellers: SellerSummary[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const key = item.sellerId === null ? `name:${item.sellerName}` : `id:${item.sellerId}`;

    if (!seen.has(key)) {
      seen.add(key);
      sellers.push({
        id: item.sellerId,
        label: item.sellerName,
        role: item.sellerRole,
      });
    }
  }

  return {
    id: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    total: order.total,
    buyer: {
      name: order.buyerName,
      email: order.buyerEmail,
      phone: order.buyerPhone,
    },
    shipping: {
      label: order.shippingLabel,
      recipientName: order.recipientName,
      phone: order.shippingPhone,
      address: order.shippingAddress,
      areaId: order.shippingAreaId,
      district: order.shippingDistrict,
      city: order.shippingCity,
      province: order.shippingProvince,
      postalCode: order.shippingPostalCode,
      note: order.shippingNote,
    },
    courier: {
      code: order.courierCode,
      name: order.courierName,
      service: order.courierService,
      eta: order.courierEta,
    },
    items: items.map(toItemView),
    sellers,
    expiresAt: order.expiresAt.toISOString(),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export async function cancelOrderForExpiry(orderId: number): Promise<void> {
  await db.transaction(async (tx) => {
    const [expired] = await tx
      .update(orders)
      .set({ status: 'Dibatalkan', paymentStatus: 'expired', updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.status, 'Menunggu Pembayaran')))
      .returning({ id: orders.id });

    if (!expired) {
      return;
    }

    await tx
      .update(payments)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(and(eq(payments.orderId, orderId), eq(payments.status, 'pending')));

    const items = await tx
      .select({ variantId: orderItems.variantId, qty: orderItems.qty })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    for (const item of items) {
      if (item.variantId !== null) {
        await tx
          .update(variants)
          .set({ stock: sql`${variants.stock} + ${item.qty}` })
          .where(eq(variants.id, item.variantId));
      }
    }
  });
}

export async function expirePendingOrders(userId: number): Promise<void> {
  const now = new Date();
  const [pendingByOrder, pendingByPayment] = await Promise.all([
    db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          eq(orders.status, 'Menunggu Pembayaran'),
          lte(orders.expiresAt, now),
        ),
      ),
    db
      .select({ orderId: payments.orderId })
      .from(payments)
      .innerJoin(orders, eq(payments.orderId, orders.id))
      .where(
        and(
          eq(orders.userId, userId),
          eq(orders.status, 'Menunggu Pembayaran'),
          eq(payments.status, 'pending'),
          lte(payments.expiresAt, now),
        ),
      ),
  ]);

  const orderIds = new Set([
    ...pendingByOrder.map((order) => order.id),
    ...pendingByPayment.map((payment) => payment.orderId),
  ]);

  for (const orderId of orderIds) {
    await cancelOrderForExpiry(orderId);
  }
}

async function findOrderItems(orderIds: number[]): Promise<Map<number, OrderItem[]>> {
  const grouped = new Map<number, OrderItem[]>();

  if (orderIds.length === 0) {
    return grouped;
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds))
    .orderBy(asc(orderItems.id));

  for (const item of items) {
    const list = grouped.get(item.orderId) ?? [];
    list.push(item);
    grouped.set(item.orderId, list);
  }

  return grouped;
}

export async function listOrders(
  userId: number,
  query: OrderListQuery,
): Promise<{ data: OrderView[]; meta: PaginationMeta }> {
  await expirePendingOrders(userId);

  const where = and(
    eq(orders.userId, userId),
    query.status === undefined ? undefined : eq(orders.status, query.status),
  );

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt), desc(orders.id))
      .limit(query.perPage)
      .offset(paginationOffset(query)),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(orders)
      .where(where),
  ]);

  const itemsByOrder = await findOrderItems(rows.map((row) => row.id));
  const total = countRows[0]?.total ?? 0;

  return paginate(
    rows.map((order) => toView(order, itemsByOrder.get(order.id) ?? [])),
    total,
    query,
  );
}

export async function getOrder(userId: number, orderId: number): Promise<OrderView> {
  await expirePendingOrders(userId);

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);

  if (!order) {
    throw new AppError(404, 'Pesanan tidak ditemukan');
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .orderBy(asc(orderItems.id));

  return toView(order, items);
}

export async function createCheckout(
  userId: number,
  input: CheckoutInput,
): Promise<{ orderId: number }> {
  await expirePendingOrders(userId);

  return db.transaction(async (tx) => {
    const cartRows = await tx
      .select({
        productId: products.id,
        productSlug: products.slug,
        productName: products.name,
        productImage: products.image,
        productPrice: products.price,
        variantId: variants.id,
        variantSku: variants.sku,
        variantSize: variants.size,
        variantStock: variants.stock,
        variantPriceAdjustment: variants.priceAdjustment,
        sellerId: sellers.id,
        sellerName: sellers.name,
        sellerRole: sellers.role,
        qty: cartItems.qty,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .innerJoin(sellers, eq(products.sellerId, sellers.id))
      .leftJoin(variants, eq(cartItems.variantId, variants.id))
      .where(eq(cartItems.userId, userId))
      .orderBy(asc(cartItems.id));

    if (cartRows.length === 0) {
      throw new AppError(422, 'Keranjang kosong', {
        details: { fields: { cart: 'Keranjang masih kosong' } },
      });
    }

    const [address] = await tx
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, input.addressId), eq(addresses.userId, userId)))
      .limit(1);

    if (!address) {
      throw new AppError(404, 'Alamat tidak ditemukan');
    }

    const [rate] = await tx
      .select()
      .from(shippingRates)
      .where(eq(shippingRates.id, input.shippingRateId))
      .limit(1);

    if (!rate) {
      throw new AppError(404, 'Tarif pengiriman tidak ditemukan');
    }

    const [user] = await tx
      .select({ name: users.name, email: users.email, phone: users.phone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new AppError(404, 'Pengguna tidak ditemukan');
    }

    const preparedItems: Omit<typeof orderItems.$inferInsert, 'orderId'>[] = [];

    for (const row of cartRows) {
      let variant =
        row.variantId === null
          ? undefined
          : {
              id: row.variantId,
              sku: row.variantSku ?? '',
              size: row.variantSize ?? '',
              stock: row.variantStock ?? 0,
              priceAdjustment: row.variantPriceAdjustment ?? 0,
            };

      if (row.variantId === null) {
        const productVariants = await tx
          .select()
          .from(variants)
          .where(eq(variants.productId, row.productId))
          .orderBy(asc(variants.id));

        if (productVariants.length > 1) {
          throw new AppError(422, 'Varian wajib dipilih', {
            details: {
              fields: { variantId: `Pilih varian untuk ${row.productName} sebelum checkout` },
            },
          });
        }

        variant = productVariants[0];
      }

      if (variant && variant.stock < row.qty) {
        throw new AppError(422, 'Stok tidak mencukupi', {
          details: { fields: { stock: `Stok ${row.productName} tidak mencukupi` } },
        });
      }

      if (variant) {
        const [updated] = await tx
          .update(variants)
          .set({ stock: sql`${variants.stock} - ${row.qty}` })
          .where(and(eq(variants.id, variant.id), gte(variants.stock, row.qty)))
          .returning({ id: variants.id });

        if (!updated) {
          throw new AppError(422, 'Stok tidak mencukupi', {
            details: { fields: { stock: `Stok ${row.productName} tidak mencukupi` } },
          });
        }
      }

      const priceAdjustment = row.variantId === null ? 0 : (variant?.priceAdjustment ?? 0);
      const unitPrice = row.productPrice + priceAdjustment;

      preparedItems.push({
        productId: row.productId,
        productSlug: row.productSlug,
        productName: row.productName,
        productImage: row.productImage,
        variantId: variant?.id ?? null,
        variantSku: variant?.sku ?? null,
        variantSize: variant?.size ?? null,
        sellerId: row.sellerId,
        sellerName: row.sellerName,
        sellerRole: row.sellerRole,
        unitPrice,
        priceAdjustment,
        qty: row.qty,
        subtotal: unitPrice * row.qty,
      });
    }

    const subtotal = preparedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const total = subtotal + rate.price;

    const [order] = await tx
      .insert(orders)
      .values({
        userId,
        paymentMethod: input.paymentMethod ?? null,
        subtotal,
        shippingCost: rate.price,
        total,
        buyerName: user.name,
        buyerEmail: user.email,
        buyerPhone: user.phone ?? address.phone,
        shippingLabel: address.label,
        recipientName: address.recipientName,
        shippingPhone: address.phone,
        shippingAddress: address.address,
        shippingAreaId: address.areaId,
        shippingDistrict: address.district,
        shippingCity: address.city,
        shippingProvince: address.province,
        shippingPostalCode: address.postalCode,
        shippingNote: address.note,
        courierCode: rate.code,
        courierName: rate.courier,
        courierService: rate.service,
        courierEta: rate.eta,
        expiresAt: new Date(Date.now() + PENDING_TTL_MS),
      })
      .returning({ id: orders.id });

    if (!order) {
      throw new Error('Failed to create order');
    }

    await tx.insert(orderItems).values(
      preparedItems.map((item) => ({
        orderId: order.id,
        ...item,
      })),
    );

    await tx.delete(cartItems).where(eq(cartItems.userId, userId));

    return { orderId: order.id };
  });
}

export async function receiveOrder(userId: number, orderId: number): Promise<OrderView> {
  await expirePendingOrders(userId);

  const [order] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);

  if (!order) {
    throw new AppError(404, 'Pesanan tidak ditemukan');
  }

  assertTransition(order.status, 'Selesai');

  await db
    .update(orders)
    .set({ status: 'Selesai', updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));

  return getOrder(userId, orderId);
}

export async function getInvoice(userId: number, orderId: number) {
  const order = await getOrder(userId, orderId);
  const [payment] = await db
    .select({ methodLabel: payments.methodLabel, vaNumber: payments.vaNumber })
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .orderBy(desc(payments.id))
    .limit(1);
  const shippingAddress = [
    order.shipping.address,
    order.shipping.district,
    order.shipping.city,
    order.shipping.province,
  ]
    .filter(Boolean)
    .join(', ');

  return {
    orderId: order.id,
    invoiceNumber: `INV-${String(order.id).padStart(6, '0')}`,
    issuedAt: order.createdAt,
    customerName: order.buyer.name,
    customerType: 'Pelanggan',
    customerEmail: order.buyer.email,
    customerPhone: order.buyer.phone,
    recipient: order.shipping.recipientName,
    shippingAddress,
    shippingPostalCode: order.shipping.postalCode,
    shipping: order.shipping,
    paymentMethod: order.paymentMethod ?? payment?.methodLabel ?? null,
    paymentStatus: order.paymentStatus,
    virtualAccountNumber: payment?.vaNumber ?? null,
    items: order.items,
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    total: order.total,
    status: order.status,
    courier: order.courier,
  };
}
