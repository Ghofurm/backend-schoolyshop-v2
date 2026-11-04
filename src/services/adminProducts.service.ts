import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { PRODUCT_UPLOAD_DIR } from '../config/uploads.js';
import {
  categories,
  orderItems,
  products,
  sellers,
  variants,
  type ProductStatus,
  type SellerRole,
} from '../db/schema.js';
import type {
  AdminProductListQuery,
  CreateProductInput,
  UpdateProductInput,
  VariantInput,
} from '../schemas/adminCatalog.schema.js';
import { AppError } from '../utils/httpError.js';
import { isUniqueViolation } from '../utils/postgres.js';
import { paginate, paginationOffset } from '../utils/pagination.js';
import { slugify } from '../utils/slug.js';

const LOW_STOCK_THRESHOLD = 5;
const NEW_PRODUCT_DAYS = 30;

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export interface AdminVariantView {
  id: number;
  sku: string;
  size: string;
  stock: number;
  priceAdjustment: number;
}

export interface AdminProductView {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  tag: string;
  image: string | null;
  featured: boolean;
  weight: number;
  status: ProductStatus;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  sellerId: number;
  sellerName: string;
  sellerRole: SellerRole;
  stock: number;
  variants: AdminVariantView[];
  isNew: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AdminProductRow {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  tag: string;
  image: string | null;
  featured: boolean;
  weight: number;
  status: ProductStatus;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  sellerId: number;
  sellerName: string;
  sellerRole: SellerRole;
  createdAt: Date;
  updatedAt: Date;
  stock: number;
}

const productSelection = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  description: products.description,
  price: products.price,
  tag: products.tag,
  image: products.image,
  featured: products.featured,
  weight: products.weight,
  status: products.status,
  categoryId: categories.id,
  categoryName: categories.name,
  categorySlug: categories.slug,
  sellerId: sellers.id,
  sellerName: sellers.name,
  sellerRole: sellers.role,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
  stock: sql<number>`coalesce(sum(${variants.stock}), 0)`.mapWith(Number),
};

function isNewProduct(createdAt: Date): boolean {
  return createdAt.getTime() >= Date.now() - NEW_PRODUCT_DAYS * 24 * 60 * 60 * 1000;
}

function toView(row: AdminProductRow, variantRows: AdminVariantView[]): AdminProductView {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    price: row.price,
    tag: row.tag,
    image: row.image,
    featured: row.featured,
    weight: row.weight,
    status: row.status,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    categorySlug: row.categorySlug,
    sellerId: row.sellerId,
    sellerName: row.sellerName,
    sellerRole: row.sellerRole,
    stock: row.stock,
    variants: variantRows,
    isNew: isNewProduct(row.createdAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function loadVariants(productIds: number[]): Promise<Map<number, AdminVariantView[]>> {
  const grouped = new Map<number, AdminVariantView[]>();

  if (productIds.length === 0) {
    return grouped;
  }

  const rows = await db
    .select({
      id: variants.id,
      productId: variants.productId,
      sku: variants.sku,
      size: variants.size,
      stock: variants.stock,
      priceAdjustment: variants.priceAdjustment,
    })
    .from(variants)
    .where(inArray(variants.productId, productIds))
    .orderBy(asc(variants.id));

  for (const row of rows) {
    const list = grouped.get(row.productId) ?? [];
    list.push({
      id: row.id,
      sku: row.sku,
      size: row.size,
      stock: row.stock,
      priceAdjustment: row.priceAdjustment,
    });
    grouped.set(row.productId, list);
  }

  return grouped;
}

function buildWhere(query: AdminProductListQuery) {
  const search = query.search ?? query.q;
  const pattern = search === undefined ? undefined : `%${search}%`;
  const categoryFilter =
    query.category === undefined
      ? undefined
      : /^\d+$/.test(query.category)
        ? eq(products.categoryId, Number(query.category))
        : or(eq(categories.slug, query.category), eq(categories.name, query.category));

  return and(
    pattern === undefined ? undefined : or(ilike(products.name, pattern), ilike(products.slug, pattern)),
    categoryFilter,
    query.status === undefined ? undefined : eq(products.status, query.status),
  );
}

export async function listAdminProducts(query: AdminProductListQuery) {
  const where = buildWhere(query);

  const [rows, countRows, summaryRows] = await Promise.all([
    db
      .select(productSelection)
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .innerJoin(sellers, eq(products.sellerId, sellers.id))
      .leftJoin(variants, eq(variants.productId, products.id))
      .where(where)
      .groupBy(products.id, categories.id, sellers.id)
      .orderBy(desc(products.createdAt), desc(products.id))
      .limit(query.perPage)
      .offset(paginationOffset(query)),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .innerJoin(sellers, eq(products.sellerId, sellers.id))
      .where(where),
    db
      .select({
        status: products.status,
        createdAt: products.createdAt,
        stock: sql<number>`coalesce(sum(${variants.stock}), 0)`.mapWith(Number),
      })
      .from(products)
      .leftJoin(variants, eq(variants.productId, products.id))
      .groupBy(products.id, products.status, products.createdAt),
  ]);

  const variantsByProduct = await loadVariants(rows.map((row) => row.id));
  const data = rows.map((row) => toView(row, variantsByProduct.get(row.id) ?? []));

  const summary = summaryRows.reduce(
    (acc, row) => {
      acc.total += 1;

      if (row.status === 'Aktif') {
        acc.active += 1;
      } else {
        acc.inactive += 1;
      }

      if (row.stock <= LOW_STOCK_THRESHOLD) {
        acc.lowStock += 1;
      }

      if (isNewProduct(row.createdAt)) {
        acc.new += 1;
      }

      return acc;
    },
    { total: 0, active: 0, inactive: 0, lowStock: 0, new: 0 },
  );

  return {
    ...paginate(data, countRows[0]?.total ?? 0, query),
    summary,
  };
}

async function findAdminProduct(id: number): Promise<AdminProductView> {
  const [row] = await db
    .select(productSelection)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .innerJoin(sellers, eq(products.sellerId, sellers.id))
    .leftJoin(variants, eq(variants.productId, products.id))
    .where(eq(products.id, id))
    .groupBy(products.id, categories.id, sellers.id)
    .limit(1);

  if (!row) {
    throw new AppError(404, 'Produk tidak ditemukan');
  }

  const variantsByProduct = await loadVariants([row.id]);

  return toView(row, variantsByProduct.get(row.id) ?? []);
}

async function ensureReferences(categoryId?: number, sellerId?: number): Promise<void> {
  if (categoryId !== undefined) {
    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1);

    if (!category) {
      throw new AppError(422, 'Kategori tidak ditemukan', {
        details: { fields: { categoryId: 'Kategori tidak ditemukan' } },
      });
    }
  }

  if (sellerId !== undefined) {
    const [seller] = await db
      .select({ id: sellers.id })
      .from(sellers)
      .where(eq(sellers.id, sellerId))
      .limit(1);

    if (!seller) {
      throw new AppError(422, 'Penjual tidak ditemukan', {
        details: { fields: { sellerId: 'Penjual tidak ditemukan' } },
      });
    }
  }
}

async function uniqueProductSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let suffix = 2;

  while (
    (
      await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.slug, slug))
        .limit(1)
    ).length > 0
  ) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

async function uniqueSku(base: string): Promise<string> {
  let sku = base;
  let suffix = 2;

  while (
    (
      await db
        .select({ id: variants.id })
        .from(variants)
        .where(eq(variants.sku, sku))
        .limit(1)
    ).length > 0
  ) {
    sku = `${base}-${suffix}`;
    suffix += 1;
  }

  return sku;
}

async function prepareVariants(
  productSlug: string,
  input: VariantInput[],
): Promise<Array<{ sku: string; size: string; stock: number; priceAdjustment: number }>> {
  const seen = new Set<string>();
  const prepared: Array<{
    sku: string;
    size: string;
    stock: number;
    priceAdjustment: number;
  }> = [];

  for (const variant of input) {
    const key = variant.size.toLowerCase();

    if (seen.has(key)) {
      throw new AppError(422, 'Ukuran varian duplikat', {
        details: { fields: { variants: `Ukuran ${variant.size} duplikat` } },
      });
    }

    seen.add(key);
    prepared.push({
      sku: variant.sku ?? (await uniqueSku(`${productSlug}-${slugify(variant.size)}`)),
      size: variant.size,
      stock: variant.stock,
      priceAdjustment: variant.priceAdjustment,
    });
  }

  return prepared;
}

export async function createAdminProduct(input: CreateProductInput): Promise<AdminProductView> {
  await ensureReferences(input.categoryId, input.sellerId);
  const slug = await uniqueProductSlug(input.name);
  const variantsInput =
    input.variants && input.variants.length > 0
      ? input.variants
      : [{ size: 'All Size', stock: input.stock ?? 0, priceAdjustment: 0 }];
  const preparedVariants = await prepareVariants(slug, variantsInput);

  try {
    const productId = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(products)
        .values({
          slug,
          name: input.name,
          description: input.description,
          price: input.price,
          tag: input.tag,
          weight: input.weight,
          image: input.image ?? null,
          featured: input.featured,
          status: input.status,
          categoryId: input.categoryId,
          sellerId: input.sellerId,
        })
        .returning({ id: products.id });

      if (!created) {
        throw new Error('Failed to create product');
      }

      await tx.insert(variants).values(
        preparedVariants.map((variant) => ({
          productId: created.id,
          ...variant,
        })),
      );

      return created.id;
    });

    return findAdminProduct(productId);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, 'Produk dengan slug atau SKU serupa sudah ada', {
        code: 'CONFLICT',
      });
    }

    throw error;
  }
}

export async function updateAdminProduct(
  id: number,
  input: UpdateProductInput,
): Promise<AdminProductView> {
  const [existing] = await db
    .select({ id: products.id, slug: products.slug })
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!existing) {
    throw new AppError(404, 'Produk tidak ditemukan');
  }

  await ensureReferences(input.categoryId, input.sellerId);

  const { variants: variantInputs, stock, ...fields } = input;

  try {
    await db.transaction(async (tx) => {
      if (Object.keys(fields).length > 0) {
        await tx
          .update(products)
          .set({ ...fields, updatedAt: new Date() })
          .where(eq(products.id, id));
      }

      if (variantInputs !== undefined) {
        for (const variant of variantInputs) {
          if (variant.id !== undefined) {
            const [existingVariant] = await tx
              .select({ id: variants.id, sku: variants.sku })
              .from(variants)
              .where(and(eq(variants.id, variant.id), eq(variants.productId, id)))
              .limit(1);

            if (!existingVariant) {
              throw new AppError(422, 'Varian tidak ditemukan', {
                details: { fields: { variants: 'Varian bukan milik produk ini' } },
              });
            }

            await tx
              .update(variants)
              .set({
                sku: variant.sku ?? existingVariant.sku,
                size: variant.size,
                stock: variant.stock,
                priceAdjustment: variant.priceAdjustment,
              })
              .where(eq(variants.id, variant.id));
          } else {
            const sku =
              variant.sku ??
              (await uniqueSku(`${existing.slug}-${slugify(variant.size)}`));

            await tx.insert(variants).values({
              productId: id,
              sku,
              size: variant.size,
              stock: variant.stock,
              priceAdjustment: variant.priceAdjustment,
            });
          }
        }
      } else if (stock !== undefined) {
        const currentVariants = await tx
          .select({ id: variants.id })
          .from(variants)
          .where(eq(variants.productId, id))
          .orderBy(asc(variants.id));

        if (currentVariants.length === 0) {
          await tx.insert(variants).values({
            productId: id,
            sku: await uniqueSku(`${existing.slug}-all-size`),
            size: 'All Size',
            stock,
            priceAdjustment: 0,
          });
        } else if (currentVariants.length === 1) {
          await tx
            .update(variants)
            .set({ stock })
            .where(eq(variants.id, currentVariants[0]!.id));
        } else {
          throw new AppError(422, 'Produk memiliki beberapa varian', {
            details: { fields: { stock: 'Gunakan variants untuk mengubah stok per varian' } },
          });
        }
      }
    });

    return findAdminProduct(id);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, 'SKU varian sudah dipakai', { code: 'CONFLICT' });
    }

    throw error;
  }
}

export async function deleteAdminProduct(id: number): Promise<void> {
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!product) {
    throw new AppError(404, 'Produk tidak ditemukan');
  }

  const [history] = await db
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(orderItems)
    .where(eq(orderItems.productId, id));

  if ((history?.total ?? 0) > 0) {
    throw new AppError(409, 'Produk memiliki riwayat pesanan dan tidak dapat dihapus', {
      code: 'CONFLICT',
    });
  }

  await db.delete(products).where(eq(products.id, id));
}

export async function updateAdminProductImage(
  id: number,
  file: Express.Multer.File,
): Promise<AdminProductView> {
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!product) {
    throw new AppError(404, 'Produk tidak ditemukan');
  }

  const extension = IMAGE_EXTENSIONS[file.mimetype];

  if (!extension) {
    throw new AppError(422, 'Format gambar tidak didukung', {
      details: { fields: { image: 'Gunakan gambar JPEG, PNG, atau WebP' } },
    });
  }

  const directory = path.join(PRODUCT_UPLOAD_DIR, String(id));
  await mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}${extension}`;
  await writeFile(path.join(directory, filename), file.buffer);

  await db
    .update(products)
    .set({
      image: `/uploads/products/${id}/${filename}`,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id));

  return findAdminProduct(id);
}
