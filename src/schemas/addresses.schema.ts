import { z } from 'zod';

const requiredText = (field: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${field} wajib diisi`)
    .max(max, `${field} maksimal ${max} karakter`);

export const createAddressSchema = z.object({
  label: requiredText('Label', 40),
  recipientName: requiredText('Nama penerima', 120),
  phone: requiredText('Telepon', 32),
  address: z.string().trim().max(500, 'Alamat maksimal 500 karakter').optional(),
  areaId: requiredText('Area', 64),
  district: requiredText('Kecamatan', 120),
  city: requiredText('Kota', 120),
  province: requiredText('Provinsi', 120),
  postalCode: requiredText('Kode pos', 10),
  note: z.string().trim().max(500, 'Catatan maksimal 500 karakter').optional(),
  isPrimary: z.boolean().optional(),
});

export const updateAddressSchema = createAddressSchema.partial();

export const addressIdParamSchema = z.coerce.number().int().positive();

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
