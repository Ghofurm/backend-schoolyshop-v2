import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import { addresses, type Address } from '../db/schema.js';
import type { CreateAddressInput, UpdateAddressInput } from '../schemas/addresses.schema.js';
import { AppError } from '../utils/httpError.js';

export interface AddressView {
  id: number;
  label: string;
  recipientName: string;
  phone: string;
  address: string | null;
  areaId: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
  note: string | null;
  isPrimary: boolean;
}

function toView(address: Address): AddressView {
  return {
    id: address.id,
    label: address.label,
    recipientName: address.recipientName,
    phone: address.phone,
    address: address.address,
    areaId: address.areaId,
    district: address.district,
    city: address.city,
    province: address.province,
    postalCode: address.postalCode,
    note: address.note,
    isPrimary: address.isPrimary,
  };
}

function notFound(): AppError {
  return new AppError(404, 'Alamat tidak ditemukan');
}

export async function listAddresses(userId: number): Promise<AddressView[]> {
  const rows = await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isPrimary), asc(addresses.id));

  return rows.map(toView);
}

export async function createAddress(
  userId: number,
  input: CreateAddressInput,
): Promise<AddressView> {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(eq(addresses.userId, userId));

    const isPrimary = input.isPrimary === true || existing.length === 0;

    if (isPrimary) {
      await tx
        .update(addresses)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(eq(addresses.userId, userId));
    }

    const [created] = await tx
      .insert(addresses)
      .values({
        ...input,
        userId,
        isPrimary,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create address');
    }

    return toView(created);
  });
}

export async function updateAddress(
  userId: number,
  addressId: number,
  input: UpdateAddressInput,
): Promise<AddressView> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
      .limit(1);

    if (!existing) {
      throw notFound();
    }

    const { isPrimary, ...fields } = input;

    if (isPrimary === true) {
      await tx
        .update(addresses)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(eq(addresses.userId, userId));
    }

    const [updated] = await tx
      .update(addresses)
      .set({
        ...fields,
        ...(isPrimary === undefined ? {} : { isPrimary }),
        updatedAt: new Date(),
      })
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
      .returning();

    if (!updated) {
      throw notFound();
    }

    return toView(updated);
  });
}

export async function deleteAddress(userId: number, addressId: number): Promise<void> {
  await db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(addresses)
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
      .returning({ id: addresses.id, isPrimary: addresses.isPrimary });

    if (!deleted) {
      throw notFound();
    }

    if (deleted.isPrimary) {
      const [next] = await tx
        .select({ id: addresses.id })
        .from(addresses)
        .where(eq(addresses.userId, userId))
        .orderBy(asc(addresses.id))
        .limit(1);

      if (next) {
        await tx
          .update(addresses)
          .set({ isPrimary: true, updatedAt: new Date() })
          .where(eq(addresses.id, next.id));
      }
    }
  });
}
