import { z } from 'zod';

export const createPaymentSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  method: z.string().trim().min(1, 'Metode pembayaran wajib diisi').max(40),
});

export const paymentIdParamSchema = z.coerce.number().int().positive();

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
