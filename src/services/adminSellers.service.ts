import { and, asc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { products, sellers, type SellerRole } from '../db/schema.js';
import type {
  AdminSellerListQuery,
  CreateSellerInput,
  UpdateSellerInput,
} from '../schemas/adminCatalog.schema.js';
import { AppError } from '../utils/httpError.js';
import { isUniqueViolation } from '../utils/postgres.js';
import { paginate, paginationOffset } from '../utils/pagination.js';

export interface AdminSellerView {
  id: number;
  name: string;
  role: SellerRole;
  business: string | null;
  type: string | null;
  kk: string | null;
  address: string | null;
  whatsapp: string | null;
  productCount: number;
}

const sellerSelection = {
  id: sellers.id,
  name: sellers.name,
  role: sellers.role,
  business: sellers.business,
  type: sellers.type,
  kk: sellers.kk,
  address: sellers.address,
  whatsapp: sellers.whatsapp,
  productCount: sql<number>`count(${products.id})`.mapWith(Number),
};

async function findSeller(id: number): Promise<AdminSellerView> {
  const [row] = await db
    .select(sellerSelection)
    .from(sellers)
    .leftJoin(products, eq(products.sellerId, sellers.id))
    .where(eq(sellers.id, id))
    .groupBy(sellers.id)
    .limit(1);

  if (!row) {
    throw new AppError(404, 'Penjual tidak ditemukan');
  }

  return row;
}

export async function listAdminSellers(query: AdminSellerListQuery) {
  const search = query.search ?? query.q;
  const pattern = search === undefined ? undefined : `%${search}%`;
  const where = and(
    pattern === undefined
      ? undefined
      : or(
          ilike(sellers.name, pattern),
          ilike(sellers.business, pattern),
          ilike(sellers.type, pattern),
          ilike(sellers.kk, pattern),
        ),
    query.role === undefined ? undefined : eq(sellers.role, query.role),
  );

  const [rows, countRows, summaryRows] = await Promise.all([
    db
      .select(sellerSelection)
      .from(sellers)
      .leftJoin(products, eq(products.sellerId, sellers.id))
      .where(where)
      .groupBy(sellers.id)
      .orderBy(asc(sellers.id))
      .limit(query.perPage)
      .offset(paginationOffset(query)),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(sellers)
      .where(where),
    db
      .select({ role: sellers.role, total: sql<number>`count(*)`.mapWith(Number) })
      .from(sellers)
      .groupBy(sellers.role),
  ]);

  const summary = summaryRows.reduce(
    (acc, row) => {
      if (row.role === 'Guru') acc.guru += row.total;
      if (row.role === 'Siswa') acc.siswa += row.total;
      if (row.role === 'Karyawan') acc.karyawan += row.total;
      acc.total += row.total;
      return acc;
    },
    { total: 0, guru: 0, siswa: 0, karyawan: 0 },
  );

  return {
    ...paginate(rows, countRows[0]?.total ?? 0, query),
    summary,
  };
}

export async function createAdminSeller(
  input: CreateSellerInput,
): Promise<AdminSellerView> {
  try {
    const [created] = await db
      .insert(sellers)
      .values(input)
      .returning({ id: sellers.id });

    if (!created) {
      throw new Error('Failed to create seller');
    }

    return findSeller(created.id);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, 'Nama penjual sudah dipakai', { code: 'CONFLICT' });
    }

    throw error;
  }
}

export async function updateAdminSeller(
  id: number,
  input: UpdateSellerInput,
): Promise<AdminSellerView> {
  const [existing] = await db
    .select({ id: sellers.id })
    .from(sellers)
    .where(eq(sellers.id, id))
    .limit(1);

  if (!existing) {
    throw new AppError(404, 'Penjual tidak ditemukan');
  }

  try {
    if (Object.keys(input).length > 0) {
      await db.update(sellers).set(input).where(eq(sellers.id, id));
    }

    return findSeller(id);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, 'Nama penjual sudah dipakai', { code: 'CONFLICT' });
    }

    throw error;
  }
}
