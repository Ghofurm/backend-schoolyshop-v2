import { and, eq, ne } from 'drizzle-orm';
import { db } from '../config/database.js';
import { sessions, users, type User, type UserRole } from '../db/schema.js';
import type { ChangePasswordInput, UpdateProfileInput } from '../schemas/users.schema.js';
import { AppError } from '../utils/httpError.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { isUniqueViolation } from '../utils/postgres.js';
import { hashToken } from '../utils/token.js';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  createdAt: string;
}

export function toUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

function emailTaken(): AppError {
  return new AppError(409, 'Email sudah terdaftar', { code: 'EMAIL_TAKEN' });
}

export async function updateProfile(
  userId: number,
  input: UpdateProfileInput,
): Promise<UserProfile> {
  if (input.email !== undefined) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (existing && existing.id !== userId) {
      throw emailTaken();
    }
  }

  try {
    const [updated] = await db
      .update(users)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new AppError(404, 'Pengguna tidak ditemukan');
    }

    return toUserProfile(updated);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw emailTaken();
    }

    throw error;
  }
}

export async function changePassword(
  userId: number,
  input: ChangePasswordInput,
  currentToken?: string,
): Promise<void> {
  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new AppError(404, 'Pengguna tidak ditemukan');
  }

  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new AppError(422, 'Data yang dikirim tidak valid', {
      details: { fields: { currentPassword: 'Kata sandi lama salah' } },
    });
  }

  const passwordHash = await hashPassword(input.newPassword);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));

  if (currentToken) {
    await db
      .delete(sessions)
      .where(and(eq(sessions.userId, userId), ne(sessions.id, hashToken(currentToken))));
  } else {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }
}
