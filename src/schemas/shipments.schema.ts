import { z } from 'zod';
import { ADMIN_SHIPMENT_STATUSES } from '../db/schema.js';
import { paginationQuerySchema } from '../utils/pagination.js';

export const adminShipmentListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  status: z.enum(ADMIN_SHIPMENT_STATUSES).optional(),
  courier: z.string().trim().min(1).optional(),
});

export const createShipmentSchema = z
  .object({
    orderId: z.coerce.number().int().positive(),
    shippingRateId: z
      .union([z.coerce.number().int().positive(), z.string().trim().min(1).max(100)])
      .optional(),
    courier: z.string().trim().min(1).max(80).optional(),
    service: z.string().trim().min(1).max(80).optional(),
  })
  .refine((input) => input.shippingRateId !== undefined || input.courier !== undefined, {
    message: 'shippingRateId atau courier wajib diisi',
    path: ['shippingRateId'],
  });

export const shipmentIdParamSchema = z.coerce.number().int().positive();

export const trackShipmentQuerySchema = z.object({
  q: z.string().trim().min(1, 'Resi atau ID pesanan wajib diisi').max(80),
});

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
export type AdminShipmentListQuery = z.infer<typeof adminShipmentListQuerySchema>;
