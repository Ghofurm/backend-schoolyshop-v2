import { z } from 'zod';
import { ORDER_STATUSES, PAYMENT_STATUSES, VERIFICATION_DECISIONS } from '../db/schema.js';
import { paginationQuerySchema } from '../utils/pagination.js';

export const adminOrderListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  orderStatus: z.enum(ORDER_STATUSES).optional(),
});

export const verifyOrderSchema = z
  .object({
    decision: z.enum(VERIFICATION_DECISIONS),
    reason: z.string().trim().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.decision === 'reject' && (!value.reason || value.reason.length === 0)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Alasan penolakan wajib diisi',
        path: ['reason'],
      });
    }
  });

export const adminOrderIdParamSchema = z.coerce.number().int().positive();

export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;
export type VerifyOrderInput = z.infer<typeof verifyOrderSchema>;
