import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import {
  cartItems,
  products,
  sellers,
  variants,
  type SellerRole,
} from '../db/schema.js';
import type { AddCartItemInput } from '../schemas/cart.schema.js';
import { AppError } from '../utils/httpError.js';

export interface CartItem {
  id: number;
  productId: number;
  variantId: number | null;
  qty: number;
  unitPrice: number;
  subtotal: number;
  product: {
    id: number;
    slug: string;
    name: string;
    price: number;
    image: string | null;
    seller: {
      id: number;
      label: string;
      role: SellerRole;
    };
  };
  variant: {
    id: number;
    sku: string;
    size: string;
    stock: number;
    priceAdjustment: number;
  } | null;
}

export interface CartResponse {
  data: CartItem[];
  total: number;
  itemCount: number;
}

function stockError(stock: number): AppError {
  return new AppError(422, 'Stok tidak mencukupi', {
    details: { fields: { qty: `Stok tersedia ${stock}` } },
  });
}

async function resolveStock(productId: number, variantId?: number): Promise<number> {
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) {
    throw new AppError(404, 'Produk tidak ditemukan');
  }

  if (variantId !== undefined) {
    const [variant] = await db
      .select({ stock: variants.stock })
      .from(variants)
      .where(and(eq(variants.id, variantId), eq(variants.productId, productId)))
      .limit(1);

    if (!variant) {
      throw new AppError(422, 'Varian tidak valid', {
        details: { fields: { variantId: 'Varian tidak ditemukan untuk produk ini' } },
      });
    }

    return variant.stock;
  }

  const [row] = await db
    .select({ stock: sql<number>`coalesce(sum(${variants.stock}), 0)`.mapWith(Number) })
    .from(variants)
    .where(eq(variants.productId, productId));

  return row?.stock ?? 0;
}

export async function getCart(userId: number): Promise<CartResponse> {
  const rows = await db
    .select({
      id: cartItems.id,
      qty: cartItems.qty,
      productId: products.id,
      productSlug: products.slug,
      productName: products.name,
      productPrice: products.price,
      productImage: products.image,
      sellerId: sellers.id,
      sellerName: sellers.name,
      sellerRole: sellers.role,
      variantId: variants.id,
      variantSku: variants.sku,
      variantSize: variants.size,
      variantStock: variants.stock,
      variantPriceAdjustment: variants.priceAdjustment,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .innerJoin(sellers, eq(products.sellerId, sellers.id))
    .leftJoin(variants, eq(cartItems.variantId, variants.id))
    .where(eq(cartItems.userId, userId))
    .orderBy(asc(cartItems.id));

  const data = rows.map((row): CartItem => {
    const variant =
      row.variantId !== null
        ? {
            id: row.variantId,
            sku: row.variantSku ?? '',
            size: row.variantSize ?? '',
            stock: row.variantStock ?? 0,
            priceAdjustment: row.variantPriceAdjustment ?? 0,
          }
        : null;
    const unitPrice = row.productPrice + (variant?.priceAdjustment ?? 0);

    return {
      id: row.id,
      productId: row.productId,
      variantId: row.variantId,
      qty: row.qty,
      unitPrice,
      subtotal: unitPrice * row.qty,
      product: {
        id: row.productId,
        slug: row.productSlug,
        name: row.productName,
        price: row.productPrice,
        image: row.productImage,
        seller: {
          id: row.sellerId,
          label: row.sellerName,
          role: row.sellerRole,
        },
      },
      variant,
    };
  });

  return {
    data,
    total: data.reduce((sum, item) => sum + item.subtotal, 0),
    itemCount: data.reduce((sum, item) => sum + item.qty, 0),
  };
}

export async function addCartItem(
  userId: number,
  input: AddCartItemInput,
): Promise<CartResponse> {
  const [existing] = await db
    .select({ qty: cartItems.qty, variantId: cartItems.variantId })
    .from(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, input.productId)))
    .limit(1);

  if (
    existing?.variantId !== null &&
    existing?.variantId !== undefined &&
    input.variantId !== undefined &&
    existing.variantId !== input.variantId
  ) {
    throw new AppError(422, 'Produk sudah ada di keranjang dengan varian berbeda', {
      details: {
        fields: { variantId: 'Hapus item lama terlebih dahulu untuk mengganti varian' },
      },
    });
  }

  const variantId = input.variantId ?? existing?.variantId ?? undefined;
  const stock = await resolveStock(input.productId, variantId);
  const qty = (existing?.qty ?? 0) + input.qty;

  if (qty > stock) {
    throw stockError(stock);
  }

  if (existing) {
    await db
      .update(cartItems)
      .set({ qty, variantId: variantId ?? null, updatedAt: new Date() })
      .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, input.productId)));
  } else {
    await db.insert(cartItems).values({
      userId,
      productId: input.productId,
      variantId: variantId ?? null,
      qty,
    });
  }

  return getCart(userId);
}

export async function updateCartItem(
  userId: number,
  productId: number,
  qty: number,
): Promise<CartResponse> {
  const [item] = await db
    .select({ variantId: cartItems.variantId })
    .from(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
    .limit(1);

  if (!item) {
    throw new AppError(404, 'Item keranjang tidak ditemukan');
  }

  const stock = await resolveStock(productId, item.variantId ?? undefined);

  if (qty > stock) {
    throw stockError(stock);
  }

  await db
    .update(cartItems)
    .set({ qty, updatedAt: new Date() })
    .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)));

  return getCart(userId);
}

export async function removeCartItem(userId: number, productId: number): Promise<void> {
  await db
    .delete(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)));
}

export async function clearCart(userId: number): Promise<void> {
  await db.delete(cartItems).where(eq(cartItems.userId, userId));
}
