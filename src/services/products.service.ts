import { and, asc, desc, eq, gte, ilike, lte, ne, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../config/database.js';
import { categories, products, sellers, variants, type SellerRole } from '../db/schema.js';
import type { ProductListQuery, ProductSort } from '../schemas/products.schema.js';
import { AppError } from '../utils/httpError.js';
import { paginate, paginationOffset, type PaginationMeta } from '../utils/pagination.js';

export interface ProductSummary {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  tag: string;
  image: string | null;
  featured: boolean;
  weight: number;
  category: string;
  categorySlug: string;
  seller: {
    id: number;
    label: string;
    role: SellerRole;
  };
  stock: number;
}

export interface ProductVariant {
  id: number;
  sku: string;
  size: string;
  stock: number;
  priceAdjustment: number;
}

export interface ProductDetail extends ProductSummary {
  variants: ProductVariant[];
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
  categoryName: categories.name,
  categorySlug: categories.slug,
  sellerId: sellers.id,
  sellerName: sellers.name,
  sellerRole: sellers.role,
  stock: sql<number>`coalesce(sum(${variants.stock}), 0)`.mapWith(Number),
};

type ProductRow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  tag: string;
  image: string | null;
  featured: boolean;
  weight: number;
  categoryName: string;
  categorySlug: string;
  sellerId: number;
  sellerName: string;
  sellerRole: SellerRole;
  stock: number;
};

function toSummary(row: ProductRow): ProductSummary {
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
    category: row.categoryName,
    categorySlug: row.categorySlug,
    seller: {
      id: row.sellerId,
      label: row.sellerName,
      role: row.sellerRole,
    },
    stock: row.stock,
  };
}

function buildFilters(query: ProductListQuery): SQL | undefined {
  const filters: SQL[] = [eq(products.status, 'Aktif')];

  if (query.q) {
    const pattern = `%${query.q}%`;
    const search = or(
      ilike(products.name, pattern),
      ilike(categories.name, pattern),
      ilike(sellers.name, pattern),
      ilike(sellers.role, pattern),
    );

    if (search) {
      filters.push(search);
    }
  }

  if (query.category) {
    const categoryFilter = or(
      eq(categories.slug, query.category),
      eq(categories.name, query.category),
    );

    if (categoryFilter) {
      filters.push(categoryFilter);
    }
  }

  if (query.minPrice !== undefined) {
    filters.push(gte(products.price, query.minPrice));
  }

  if (query.maxPrice !== undefined) {
    filters.push(lte(products.price, query.maxPrice));
  }

  if (query.featured !== undefined) {
    filters.push(eq(products.featured, query.featured));
  }

  return filters.length > 0 ? and(...filters) : undefined;
}

function orderFor(sort: ProductSort): SQL[] {
  switch (sort) {
    case 'termurah':
      return [asc(products.price), asc(products.id)];
    case 'termahal':
      return [desc(products.price), asc(products.id)];
    default:
      return [asc(products.id)];
  }
}

async function findProductRows(
  where: SQL | undefined,
  order: SQL[],
  limit: number,
  offset: number,
): Promise<ProductRow[]> {
  return db
    .select(productSelection)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .innerJoin(sellers, eq(products.sellerId, sellers.id))
    .leftJoin(variants, eq(variants.productId, products.id))
    .where(where)
    .groupBy(products.id, categories.id, sellers.id)
    .orderBy(...order)
    .limit(limit)
    .offset(offset);
}

async function countProducts(where: SQL | undefined): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .innerJoin(sellers, eq(products.sellerId, sellers.id))
    .where(where);

  return row?.total ?? 0;
}

export async function listProducts(
  query: ProductListQuery,
): Promise<{ data: ProductSummary[]; meta: PaginationMeta }> {
  const perPage = query.limit ?? query.perPage;
  const pagination = { page: query.page, perPage };
  const where = buildFilters(query);

  const [rows, total] = await Promise.all([
    findProductRows(where, orderFor(query.sort), perPage, paginationOffset(pagination)),
    countProducts(where),
  ]);

  return paginate(rows.map(toSummary), total, pagination);
}

export async function getProductBySlug(slug: string): Promise<ProductDetail> {
  const [row] = await findProductRows(
    and(eq(products.slug, slug), eq(products.status, 'Aktif')),
    [asc(products.id)],
    1,
    0,
  );

  if (!row) {
    throw new AppError(404, 'Produk tidak ditemukan');
  }

  const variantRows = await db
    .select({
      id: variants.id,
      sku: variants.sku,
      size: variants.size,
      stock: variants.stock,
      priceAdjustment: variants.priceAdjustment,
    })
    .from(variants)
    .where(eq(variants.productId, row.id))
    .orderBy(asc(variants.id));

  return {
    ...toSummary(row),
    variants: variantRows,
  };
}

export async function getRelatedProducts(id: number, limit: number): Promise<ProductSummary[]> {
  const [product] = await db
    .select({ id: products.id, categoryId: products.categoryId })
    .from(products)
    .where(and(eq(products.id, id), eq(products.status, 'Aktif')))
    .limit(1);

  if (!product) {
    throw new AppError(404, 'Produk tidak ditemukan');
  }

  const sameCategory = await findProductRows(
    and(
      eq(products.categoryId, product.categoryId),
      ne(products.id, product.id),
      eq(products.status, 'Aktif'),
    ),
    [asc(products.id)],
    limit,
    0,
  );

  if (sameCategory.length >= limit) {
    return sameCategory.map(toSummary);
  }

  const others = await findProductRows(
    and(
      ne(products.id, product.id),
      ne(products.categoryId, product.categoryId),
      eq(products.status, 'Aktif'),
    ),
    [asc(products.id)],
    limit - sameCategory.length,
    0,
  );

  return [...sameCategory, ...others].map(toSummary);
}
