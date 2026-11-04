import { z } from 'zod';
import { PRODUCT_STATUSES, SELLER_ROLES } from '../db/schema.js';
import { paginationQuerySchema } from '../utils/pagination.js';

export const catalogIdParamSchema = z.coerce.number().int().positive();

export const adminProductListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
});

export const variantInputSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  sku: z.string().trim().min(1).max(100).optional(),
  size: z.string().trim().min(1, 'Ukuran wajib diisi').max(20),
  stock: z.coerce.number().int().min(0, 'Stok minimal 0'),
  priceAdjustment: z.coerce.number().int().min(0).default(0),
});

const productFields = {
  name: z.string().trim().min(1, 'Nama produk wajib diisi').max(200),
  description: z.string().trim().min(1, 'Deskripsi wajib diisi'),
  price: z.coerce.number().int().min(1, 'Harga minimal 1'),
  tag: z.string().trim().min(1, 'Tag wajib diisi').max(60),
  categoryId: z.coerce.number().int().positive(),
  sellerId: z.coerce.number().int().positive(),
  image: z.string().trim().max(500).optional(),
  featured: z.boolean().optional().default(false),
  status: z.enum(PRODUCT_STATUSES).optional().default('Aktif'),
  variants: z.array(variantInputSchema).optional(),
  stock: z.coerce.number().int().min(0).optional(),
};

export const createProductSchema = z.object({
  ...productFields,
  tag: productFields.tag.default('Umum'),
});

export const updateProductSchema = z.object({
  name: productFields.name.optional(),
  description: productFields.description.optional(),
  price: productFields.price.optional(),
  tag: productFields.tag.optional(),
  categoryId: productFields.categoryId.optional(),
  sellerId: productFields.sellerId.optional(),
  image: z.string().trim().max(500).nullable().optional(),
  featured: z.boolean().optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  variants: z.array(variantInputSchema).optional(),
  stock: z.coerce.number().int().min(0).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Nama kategori wajib diisi').max(120),
  description: z.string().trim().max(250).optional().default(''),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, 'Nama kategori wajib diisi').max(120).optional(),
  description: z.string().trim().max(250).optional(),
});

export const adminSellerListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  role: z.enum(SELLER_ROLES).optional(),
});

export const createSellerSchema = z.object({
  name: z.string().trim().min(1, 'Nama penjual wajib diisi').max(160),
  role: z.enum(SELLER_ROLES),
  business: z.string().trim().max(160).optional(),
  type: z.string().trim().max(120).optional(),
  kk: z.string().trim().max(32).optional(),
  address: z.string().trim().max(500).optional(),
  whatsapp: z.string().trim().max(32).optional(),
});

export const updateSellerSchema = createSellerSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type VariantInput = z.infer<typeof variantInputSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateSellerInput = z.infer<typeof createSellerSchema>;
export type UpdateSellerInput = z.infer<typeof updateSellerSchema>;
export type AdminProductListQuery = z.infer<typeof adminProductListQuerySchema>;
export type AdminSellerListQuery = z.infer<typeof adminSellerListQuerySchema>;
