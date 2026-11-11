import { randomBytes } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '../config/database.js';
import { env } from '../config/env.js';
import { passwordResetTokens, sessions, users, type UserStatus } from '../db/schema.js';
import { AppError } from '../utils/httpError.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { isUniqueViolation } from '../utils/postgres.js';
import { hashToken } from '../utils/token.js';
import { toUserProfile, type UserProfile } from './users.service.js';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const REMEMBER_ME_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

export const SESSION_COOKIE = 'schoolyshop_session';

// Precomputed hash so a missing email still pays the same bcrypt cost as a real one.
const DUMMY_PASSWORD_HASH = '$2b$12$c0xomQaarpJNyGJpOh3fgu6o8f070Tx1L3C.OoeGvO8kRuMLsiQNK';

export interface SessionUser extends UserProfile {
  status: UserStatus;
}

export function getSessionToken(cookies: unknown): string | undefined {
  if (typeof cookies !== 'object' || cookies === null) {
    return undefined;
  }

  const token = (cookies as Record<string, unknown>)[SESSION_COOKIE];

  return typeof token === 'string' && token.length > 0 ? token : undefined;
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<UserProfile> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existing) {
    throw new AppError(409, 'Email sudah terdaftar', { code: 'EMAIL_TAKEN' });
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const [created] = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        passwordHash,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create user');
    }

    return toUserProfile(created);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, 'Email sudah terdaftar', { code: 'EMAIL_TAKEN' });
    }

    throw error;
  }
}

export async function authenticateUser(email: string, password: string): Promise<UserProfile> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const passwordMatches = await verifyPassword(
    password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !passwordMatches) {
    throw new AppError(401, 'Email atau kata sandi salah', { code: 'INVALID_CREDENTIALS' });
  }

  if (user.status !== 'active') {
    throw new AppError(403, 'Akun tidak aktif', { code: 'ACCOUNT_INACTIVE' });
  }

  return toUserProfile(user);
}

export async function createSession(
  userId: number,
  rememberMe: boolean,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + (rememberMe ? REMEMBER_ME_TTL_MS : SESSION_TTL_MS));

  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function findSessionUser(token: string): Promise<SessionUser | null> {
  const [row] = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, hashToken(token)))
    .limit(1);

  if (!row) {
    return null;
  }

  if (row.expiresAt.getTime() <= Date.now()) {
    // shortcut: expired sessions are deleted only when presented; add periodic cleanup if volume grows.
    await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
    return null;
  }

  return {
    ...toUserProfile(row.user),
    status: row.user.status,
  };
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

export async function requestPasswordReset(email: string): Promise<void> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  // Keep both paths doing a DB transaction so a registered email is not obvious from timing.
  await db.transaction(async (tx) => {
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user?.id ?? 0));

    if (user) {
      await tx.insert(passwordResetTokens).values({
        id: tokenHash,
        userId: user.id,
        expiresAt,
      });
    }
  });

  // shortcut: no email provider yet; log tokens outside production until delivery is added.
  if (user && env.NODE_ENV !== 'production') {
    console.log(`[auth] Password reset token for ${email}: ${token}`);
  }
}

function invalidResetToken(): AppError {
  return new AppError(422, 'Tautan reset tidak valid atau sudah kedaluwarsa', {
    code: 'VALIDATION',
    details: {
      fields: { token: 'Tautan reset tidak valid atau sudah kedaluwarsa' },
    },
  });
}

export async function resetUserPassword(token: string, password: string): Promise<void> {
  const tokenHash = hashToken(token);

  // Check cheaply before bcrypt so invalid tokens cannot burn CPU.
  const [existing] = await db
    .select({ id: passwordResetTokens.id })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.id, tokenHash),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!existing) {
    throw invalidResetToken();
  }

  const passwordHash = await hashPassword(password);

  await db.transaction(async (tx) => {
    const [resetToken] = await tx
      .delete(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.id, tokenHash),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      )
      .returning({ userId: passwordResetTokens.userId });

    if (!resetToken) {
      throw invalidResetToken();
    }

    const [updated] = await tx
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, resetToken.userId))
      .returning({ id: users.id });

    if (!updated) {
      throw new AppError(404, 'Pengguna tidak ditemukan');
    }

    await tx.delete(sessions).where(eq(sessions.userId, resetToken.userId));
  });
}
