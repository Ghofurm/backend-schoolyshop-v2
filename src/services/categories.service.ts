import { asc, eq, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { categories, products } from '../db/schema.js';

export interface CategorySummary {
  id: number;
  name: string;
  slug: string;
  productCount: number;
}

export async function listCategories(): Promise<CategorySummary[]> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      productCount: sql<number>`count(${products.id})`.mapWith(Number),
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id, categories.name, categories.slug)
    .orderBy(asc(categories.id));

  return rows;
}
