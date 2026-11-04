import { z } from 'zod';
import { USER_ROLES, USER_STATUSES } from '../db/schema.js';
import { paginationQuerySchema } from '../utils/pagination.js';

export const adminUserListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
});

export const adminUserIdParamSchema = z.coerce.number().int().positive();

export const reportDateQuerySchema = z.object({
  startDate: z.string().trim().min(1).optional(),
  endDate: z.string().trim().min(1).optional(),
});

export const salesReportQuerySchema = reportDateQuerySchema.extend({
  sellerId: z.coerce.number().int().positive().optional(),
});

export const sellerIdParamSchema = z.coerce.number().int().positive();

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type ReportDateQuery = z.infer<typeof reportDateQuerySchema>;
export type SalesReportQuery = z.infer<typeof salesReportQuerySchema>;
