import { z } from 'zod';
import { MAX_PER_PAGE, paginationQuerySchema } from '../utils/pagination.js';

export const PRODUCT_SORTS = ['relevan', 'termurah', 'termahal'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const productListQuerySchema = paginationQuerySchema
  .extend({
    q: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1).optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    sort: z.enum(PRODUCT_SORTS).default('relevan'),
    featured: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    limit: z.coerce.number().int().min(1).max(MAX_PER_PAGE).optional(),
  })
  .refine(
    (query) =>
      query.minPrice === undefined ||
      query.maxPrice === undefined ||
      query.minPrice <= query.maxPrice,
    {
      message: 'minPrice tidak boleh lebih besar dari maxPrice',
      path: ['maxPrice'],
    },
  );

export const productSlugParamSchema = z.string().trim().min(1);
export const productIdParamSchema = z.coerce.number().int().positive();

export const relatedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(4),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;
