import { z } from 'zod';

export const MAX_PER_PAGE = 50;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(MAX_PER_PAGE).default(10),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export function paginationOffset({ page, perPage }: PaginationQuery): number {
  return (page - 1) * perPage;
}

export function paginate<T>(
  data: T[],
  total: number,
  query: PaginationQuery,
): { data: T[]; meta: PaginationMeta } {
  return {
    data,
    meta: {
      page: query.page,
      perPage: query.perPage,
      total,
      totalPages: Math.ceil(total / query.perPage),
    },
  };
}
