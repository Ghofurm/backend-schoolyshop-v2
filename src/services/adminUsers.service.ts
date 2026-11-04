import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { orders, users, type UserRole, type UserStatus } from '../db/schema.js';
import type { AdminUserListQuery } from '../schemas/adminReports.schema.js';
import { AppError } from '../utils/httpError.js';
import { paginate, paginationOffset } from '../utils/pagination.js';

const userSelection = {
  id: users.id,
  name: users.name,
  email: users.email,
  phone: users.phone,
  role: users.role,
  status: users.status,
  createdAt: users.createdAt,
  totalOrders: sql<number>`count(${orders.id})`.mapWith(Number),
  completedOrders: sql<number>`count(*) filter (where ${orders.status} = 'Selesai')`.mapWith(Number),
  processingOrders: sql<number>`count(*) filter (where ${orders.status} not in ('Selesai', 'Dibatalkan'))`.mapWith(Number),
  cancelledOrders: sql<number>`count(*) filter (where ${orders.status} = 'Dibatalkan')`.mapWith(Number),
  totalSpent: sql<number>`coalesce(sum(case when ${orders.paymentStatus} = 'paid' then ${orders.total} else 0 end), 0)`.mapWith(Number),
};

function toView(row: {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  totalOrders: number;
  completedOrders: number;
  processingOrders: number;
  cancelledOrders: number;
  totalSpent: number;
}) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    roleLabel: row.role === 'admin' ? 'Admin' : 'Pengguna',
    status: row.status,
    statusLabel: row.status === 'active' ? 'Aktif' : 'Nonaktif',
    joinedAt: row.createdAt.toISOString(),
    totalOrders: row.totalOrders,
    completedOrders: row.completedOrders,
    processingOrders: row.processingOrders,
    cancelledOrders: row.cancelledOrders,
    totalSpent: row.totalSpent,
  };
}

function buildWhere(query: AdminUserListQuery) {
  const search = query.search ?? query.q;
  const pattern = search === undefined ? undefined : `%${search}%`;

  return and(
    pattern === undefined ? undefined : or(ilike(users.name, pattern), ilike(users.email, pattern)),
    query.role === undefined ? undefined : eq(users.role, query.role),
    query.status === undefined ? undefined : eq(users.status, query.status),
  );
}

export async function listAdminUsers(query: AdminUserListQuery) {
  const where = buildWhere(query);

  const [rows, countRows] = await Promise.all([
    db
      .select(userSelection)
      .from(users)
      .leftJoin(orders, eq(orders.userId, users.id))
      .where(where)
      .groupBy(users.id)
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(query.perPage)
      .offset(paginationOffset(query)),
    db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(users).where(where),
  ]);

  return paginate(rows.map(toView), countRows[0]?.total ?? 0, query);
}

export async function getAdminUser(id: number) {
  const [row] = await db
    .select(userSelection)
    .from(users)
    .leftJoin(orders, eq(orders.userId, users.id))
    .where(eq(users.id, id))
    .groupBy(users.id)
    .limit(1);

  if (!row) {
    throw new AppError(404, 'Pengguna tidak ditemukan');
  }

  const recentOrders = await db
    .select({
      id: orders.id,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      total: orders.total,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.userId, id))
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(5);

  return {
    ...toView(row),
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.total,
      createdAt: order.createdAt.toISOString(),
    })),
  };
}
