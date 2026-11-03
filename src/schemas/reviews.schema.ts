import { z } from 'zod';

const reviewInputSchema = z.object({
  productId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1, 'Rating minimal 1').max(5, 'Rating maksimal 5'),
  comment: z.string().trim().max(1000, 'Komentar maksimal 1000 karakter').optional().default(''),
});

const reviewListSchema = z.array(reviewInputSchema).min(1, 'Minimal satu ulasan');

export const createReviewsSchema = z
  .union([
    reviewListSchema,
    z.object({ reviews: reviewListSchema }),
    z.object({ items: reviewListSchema }),
  ])
  .transform((value) => {
    if (Array.isArray(value)) {
      return value;
    }

    if ('reviews' in value) {
      return value.reviews;
    }

    return value.items;
  });

export type ReviewInput = z.infer<typeof reviewInputSchema>;
