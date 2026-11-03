import { z } from 'zod';

export const addCartItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  variantId: z.coerce.number().int().positive().optional(),
  qty: z.coerce.number().int().min(1).max(999).default(1),
});

export const updateCartItemSchema = z.object({
  qty: z.coerce.number().int().min(1).max(999),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
