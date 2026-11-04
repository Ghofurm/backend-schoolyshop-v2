import { z } from 'zod';
import { RETURN_STATUSES } from '../db/schema.js';
import { paginationQuerySchema } from '../utils/pagination.js';

export const adminReturnListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  status: z.enum(RETURN_STATUSES).optional(),
});

export const approveReturnSchema = z.object({
  refundMethod: z.string().trim().min(1, 'Metode refund wajib diisi').max(80),
  adminNote: z.string().trim().max(500).optional(),
});

export const rejectReturnSchema = z.object({
  adminNote: z.string().trim().min(1, 'Alasan penolakan wajib diisi').max(500),
});

export const adminReturnIdParamSchema = z.coerce.number().int().positive();

export type AdminReturnListQuery = z.infer<typeof adminReturnListQuerySchema>;
export type ApproveReturnInput = z.infer<typeof approveReturnSchema>;
export type RejectReturnInput = z.infer<typeof rejectReturnSchema>;
