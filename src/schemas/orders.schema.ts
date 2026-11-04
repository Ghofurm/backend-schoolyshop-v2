import { z } from 'zod';
import { ORDER_STATUSES } from '../db/schema.js';
import { paginationQuerySchema } from '../utils/pagination.js';

export const checkoutSchema = z.object({
  addressId: z.coerce.number().int().positive(),
  shippingRateId: z.union([
    z.coerce.number().int().positive(),
    z.string().trim().min(1).max(100),
  ]),
  paymentMethod: z.string().trim().min(1).max(80).optional(),
});

export const orderListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
});

export const orderIdParamSchema = z.coerce.number().int().positive();

export const shippingRatesQuerySchema = z.object({
  destinationAreaId: z.string().trim().min(1).optional(),
  weight: z.coerce.number().int().positive().optional(),
  courier: z.string().trim().min(1).optional(),
});

export const shippingAreasQuerySchema = z.object({
  q: z.string().trim().min(1, 'Kata kunci area wajib diisi').max(100),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
