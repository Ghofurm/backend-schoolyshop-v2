import { z } from 'zod';
import { emailSchema, passwordSchema } from './auth.schema.js';

const phoneSchema = z
  .string()
  .trim()
  .max(32, 'Telepon maksimal 32 karakter')
  .nullable()
  .transform((value) => (value ? value : null));

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nama wajib diisi')
    .max(120, 'Nama maksimal 120 karakter')
    .optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Kata sandi lama wajib diisi'),
  newPassword: passwordSchema,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
