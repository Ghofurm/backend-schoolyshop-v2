import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const USER_ROLES = ['admin', 'user'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['active', 'inactive'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const SELLER_ROLES = ['Guru', 'Siswa', 'Karyawan'] as const;
export type SellerRole = (typeof SELLER_ROLES)[number];

export const ORDER_STATUSES = [
  'Menunggu Pembayaran',
  'Diproses',
  'Dikirim',
  'Dalam Pengembalian',
  'Selesai',
  'Dibatalkan',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ['unpaid', 'pending', 'paid', 'expired', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const RETURN_STATUSES = ['Menunggu Keputusan', 'Disetujui', 'Ditolak'] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 32 }),
  role: varchar('role', { length: 20 }).$type<UserRole>().notNull().default('user'),
  status: varchar('status', { length: 20 }).$type<UserStatus>().notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  slug: varchar('slug', { length: 140 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;

export const sellers = pgTable('sellers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 160 }).notNull().unique(),
  role: varchar('role', { length: 20 }).$type<SellerRole>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Seller = typeof sellers.$inferSelect;

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 180 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description').notNull(),
  price: integer('price').notNull(),
  tag: varchar('tag', { length: 60 }).notNull(),
  image: varchar('image', { length: 500 }),
  featured: boolean('featured').notNull().default(false),
  categoryId: integer('category_id')
    .notNull()
    .references(() => categories.id),
  sellerId: integer('seller_id')
    .notNull()
    .references(() => sellers.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;

export const variants = pgTable('variants', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  sku: varchar('sku', { length: 100 }).notNull().unique(),
  size: varchar('size', { length: 20 }).notNull(),
  stock: integer('stock').notNull().default(0),
  priceAdjustment: integer('price_adjustment').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Variant = typeof variants.$inferSelect;

export const cartItems = pgTable(
  'cart_items',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    variantId: integer('variant_id').references(() => variants.id, { onDelete: 'cascade' }),
    qty: integer('qty').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('cart_items_user_product_unique').on(table.userId, table.productId)],
);

export type CartItem = typeof cartItems.$inferSelect;

export const addresses = pgTable(
  'addresses',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 40 }).notNull(),
    recipientName: varchar('recipient_name', { length: 120 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    address: varchar('address', { length: 500 }),
    areaId: varchar('area_id', { length: 64 }).notNull(),
    district: varchar('district', { length: 120 }).notNull(),
    city: varchar('city', { length: 120 }).notNull(),
    province: varchar('province', { length: 120 }).notNull(),
    postalCode: varchar('postal_code', { length: 10 }).notNull(),
    note: varchar('note', { length: 500 }),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('addresses_user_id_idx').on(table.userId)],
);

export type Address = typeof addresses.$inferSelect;

export const shippingRates = pgTable('shipping_rates', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 60 }).notNull().unique(),
  courier: varchar('courier', { length: 60 }).notNull(),
  service: varchar('service', { length: 80 }).notNull(),
  description: varchar('description', { length: 200 }).notNull(),
  price: integer('price').notNull(),
  eta: varchar('eta', { length: 120 }).notNull(),
  badge: varchar('badge', { length: 40 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ShippingRate = typeof shippingRates.$inferSelect;

export const orders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    status: varchar('status', { length: 30 }).$type<OrderStatus>().notNull().default('Menunggu Pembayaran'),
    paymentStatus: varchar('payment_status', { length: 20 })
      .$type<PaymentStatus>()
      .notNull()
      .default('unpaid'),
    paymentMethod: varchar('payment_method', { length: 80 }),
    subtotal: integer('subtotal').notNull(),
    shippingCost: integer('shipping_cost').notNull(),
    total: integer('total').notNull(),
    buyerName: varchar('buyer_name', { length: 120 }).notNull(),
    buyerEmail: varchar('buyer_email', { length: 255 }).notNull(),
    buyerPhone: varchar('buyer_phone', { length: 32 }).notNull(),
    shippingLabel: varchar('shipping_label', { length: 40 }),
    recipientName: varchar('recipient_name', { length: 120 }).notNull(),
    shippingPhone: varchar('shipping_phone', { length: 32 }).notNull(),
    shippingAddress: varchar('shipping_address', { length: 500 }),
    shippingAreaId: varchar('shipping_area_id', { length: 64 }).notNull(),
    shippingDistrict: varchar('shipping_district', { length: 120 }).notNull(),
    shippingCity: varchar('shipping_city', { length: 120 }).notNull(),
    shippingProvince: varchar('shipping_province', { length: 120 }).notNull(),
    shippingPostalCode: varchar('shipping_postal_code', { length: 10 }).notNull(),
    shippingNote: varchar('shipping_note', { length: 500 }),
    courierCode: varchar('courier_code', { length: 60 }).notNull(),
    courierName: varchar('courier_name', { length: 60 }).notNull(),
    courierService: varchar('courier_service', { length: 80 }).notNull(),
    courierEta: varchar('courier_eta', { length: 120 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('orders_user_id_idx').on(table.userId),
    index('orders_status_expires_idx').on(table.status, table.expiresAt),
  ],
);

export type Order = typeof orders.$inferSelect;

export const orderItems = pgTable(
  'order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
    productSlug: varchar('product_slug', { length: 180 }).notNull(),
    productName: varchar('product_name', { length: 200 }).notNull(),
    productImage: varchar('product_image', { length: 500 }),
    variantId: integer('variant_id').references(() => variants.id, { onDelete: 'set null' }),
    variantSku: varchar('variant_sku', { length: 100 }),
    variantSize: varchar('variant_size', { length: 20 }),
    sellerId: integer('seller_id').references(() => sellers.id, { onDelete: 'set null' }),
    sellerName: varchar('seller_name', { length: 160 }).notNull(),
    sellerRole: varchar('seller_role', { length: 20 }).$type<SellerRole>().notNull(),
    unitPrice: integer('unit_price').notNull(),
    priceAdjustment: integer('price_adjustment').notNull().default(0),
    qty: integer('qty').notNull(),
    subtotal: integer('subtotal').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('order_items_order_id_idx').on(table.orderId)],
);

export type OrderItem = typeof orderItems.$inferSelect;

export const payments = pgTable(
  'payments',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    method: varchar('method', { length: 20 }).notNull(),
    methodLabel: varchar('method_label', { length: 80 }).notNull(),
    vaNumber: varchar('va_number', { length: 30 }).notNull(),
    amount: integer('amount').notNull(),
    status: varchar('status', { length: 20 }).$type<PaymentStatus>().notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('payments_user_id_idx').on(table.userId),
    index('payments_order_id_idx').on(table.orderId),
    uniqueIndex('payments_pending_order_unique')
      .on(table.orderId)
      .where(sql`${table.status} = 'pending'`),
  ],
);

export type Payment = typeof payments.$inferSelect;

export const returns = pgTable(
  'returns',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 30 })
      .$type<ReturnStatus>()
      .notNull()
      .default('Menunggu Keputusan'),
    decisionAt: timestamp('decision_at', { withTimezone: true }),
    refundMethod: varchar('refund_method', { length: 80 }),
    adminNote: varchar('admin_note', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('returns_user_id_idx').on(table.userId),
    index('returns_order_id_idx').on(table.orderId),
    uniqueIndex('returns_active_order_unique')
      .on(table.orderId)
      .where(sql`${table.status} in ('Menunggu Keputusan', 'Disetujui')`),
  ],
);

export type Return = typeof returns.$inferSelect;

export const returnItems = pgTable(
  'return_items',
  {
    id: serial('id').primaryKey(),
    returnId: integer('return_id')
      .notNull()
      .references(() => returns.id, { onDelete: 'cascade' }),
    orderItemId: integer('order_item_id').references(() => orderItems.id, {
      onDelete: 'set null',
    }),
    productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
    productName: varchar('product_name', { length: 200 }).notNull(),
    variantId: integer('variant_id').references(() => variants.id, { onDelete: 'set null' }),
    variantSize: varchar('variant_size', { length: 20 }),
    qty: integer('qty').notNull(),
    reason: varchar('reason', { length: 500 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('return_items_return_id_idx').on(table.returnId)],
);

export type ReturnItem = typeof returnItems.$inferSelect;

export const returnPhotos = pgTable(
  'return_photos',
  {
    id: serial('id').primaryKey(),
    returnId: integer('return_id')
      .notNull()
      .references(() => returns.id, { onDelete: 'cascade' }),
    url: varchar('url', { length: 500 }).notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    size: integer('size').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('return_photos_return_id_idx').on(table.returnId)],
);

export type ReturnPhoto = typeof returnPhotos.$inferSelect;

export const reviews = pgTable(
  'reviews',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    orderItemId: integer('order_item_id').references(() => orderItems.id, {
      onDelete: 'set null',
    }),
    productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
    productName: varchar('product_name', { length: 200 }).notNull(),
    rating: integer('rating').notNull(),
    comment: text('comment').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('reviews_user_id_idx').on(table.userId),
    index('reviews_order_id_idx').on(table.orderId),
    uniqueIndex('reviews_order_product_unique').on(table.orderId, table.productId),
  ],
);

export type Review = typeof reviews.$inferSelect;
