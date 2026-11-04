import { asc, eq, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { categories, products } from '../db/schema.js';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../schemas/adminCatalog.schema.js';
import { AppError } from '../utils/httpError.js';
import { isUniqueViolation } from '../utils/postgres.js';
import { slugify } from '../utils/slug.js';

export interface AdminCategoryView {
  id: number;
  name: string;
  slug: string;
  description: string;
  productCount: number;
}

function toView(row: {
  id: number;
  name: string;
  slug: string;
  description: string;
  productCount: number;
}): AdminCategoryView {
  return row;
}

async function findCategory(id: number): Promise<AdminCategoryView> {
  const [row] = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      productCount: sql<number>`count(${products.id})`.mapWith(Number),
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .where(eq(categories.id, id))
    .groupBy(categories.id, categories.name, categories.slug, categories.description)
    .limit(1);

  if (!row) {
    throw new AppError(404, 'Kategori tidak ditemukan');
  }

  return toView(row);
}

async function uniqueCategorySlug(name: string, excludeId?: number): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let suffix = 2;

  while (true) {
    const [row] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    if (!row || row.id === excludeId) {
      return slug;
    }

    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function listAdminCategories(): Promise<AdminCategoryView[]> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      productCount: sql<number>`count(${products.id})`.mapWith(Number),
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id, categories.name, categories.slug, categories.description)
    .orderBy(asc(categories.id));

  return rows.map(toView);
}

export async function createAdminCategory(
  input: CreateCategoryInput,
): Promise<AdminCategoryView> {
  const slug = await uniqueCategorySlug(input.name);

  try {
    const [created] = await db
      .insert(categories)
      .values({
        name: input.name,
        slug,
        description: input.description,
      })
      .returning({ id: categories.id });

    if (!created) {
      throw new Error('Failed to create category');
    }

    return findCategory(created.id);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, 'Nama kategori sudah dipakai', { code: 'CONFLICT' });
    }

    throw error;
  }
}

export async function updateAdminCategory(
  id: number,
  input: UpdateCategoryInput,
): Promise<AdminCategoryView> {
  const [existing] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  if (!existing) {
    throw new AppError(404, 'Kategori tidak ditemukan');
  }

  const fields: { name?: string; slug?: string; description?: string } = {};

  if (input.name !== undefined) {
    fields.name = input.name;
    fields.slug = await uniqueCategorySlug(input.name, id);
  }

  if (input.description !== undefined) {
    fields.description = input.description;
  }

  try {
    if (Object.keys(fields).length > 0) {
      await db.update(categories).set(fields).where(eq(categories.id, id));
    }

    return findCategory(id);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, 'Nama kategori sudah dipakai', { code: 'CONFLICT' });
    }

    throw error;
  }
}

export async function deleteAdminCategory(id: number): Promise<void> {
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  if (!category) {
    throw new AppError(404, 'Kategori tidak ditemukan');
  }

  const [usage] = await db
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(products)
    .where(eq(products.categoryId, id));

  if ((usage?.total ?? 0) > 0) {
    throw new AppError(409, 'Kategori masih dipakai produk', { code: 'CONFLICT' });
  }

  await db.delete(categories).where(eq(categories.id, id));
}
