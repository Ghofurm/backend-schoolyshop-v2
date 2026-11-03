import { z } from 'zod';

const returnItemInputSchema = z
  .object({
    orderItemId: z.coerce.number().int().positive().optional(),
    productId: z.coerce.number().int().positive().optional(),
    qty: z.coerce.number().int().min(1, 'Qty minimal 1'),
    reason: z.string().trim().min(1, 'Alasan wajib diisi').max(500, 'Alasan maksimal 500 karakter'),
  })
  .refine((item) => item.orderItemId !== undefined || item.productId !== undefined, {
    message: 'orderItemId atau productId wajib diisi',
    path: ['productId'],
  });

export const createReturnSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  items: z.array(returnItemInputSchema).min(1, 'Minimal satu item diretur'),
});

export const returnIdParamSchema = z.coerce.number().int().positive();

export type CreateReturnInput = z.infer<typeof createReturnSchema>;
