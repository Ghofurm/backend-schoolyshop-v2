import { createHash, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/httpError.js';

const DEFAULT_EXPIRY_HOURS = 24;

export interface MidtransChargeResult {
  externalId: string;
  vaNumber: string;
  billerCode: string | null;
  methodLabel: string;
  expiresAt: Date;
}

interface MidtransChargeResponse {
  status_code?: string;
  status_message?: string;
  transaction_id?: string;
  transaction_status?: string;
  expiry_time?: string;
  va_numbers?: Array<{ bank?: string; va_number?: string }>;
  permata_va_number?: string;
  bill_key?: string;
  biller_code?: string;
}

export function isMidtransEnabled(): boolean {
  return env.MIDTRANS_SERVER_KEY.length > 0;
}

export function isMidtransProductionEnabled(): boolean {
  return isMidtransEnabled() && env.MIDTRANS_IS_PRODUCTION;
}

function baseUrl(): string {
  if (env.MIDTRANS_BASE_URL) {
    return env.MIDTRANS_BASE_URL;
  }

  return env.MIDTRANS_IS_PRODUCTION
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${env.MIDTRANS_SERVER_KEY}:`).toString('base64')}`;
}

function parseExpiry(value: string | undefined): Date {
  if (!value) {
    return new Date(Date.now() + DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000);
  }

  const parsed = new Date(`${value.replace(' ', 'T')}+07:00`);

  return Number.isNaN(parsed.getTime())
    ? new Date(Date.now() + DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000)
    : parsed;
}

async function midtransRequest<T>(path: string, body: unknown): Promise<T> {
  try {
    const response = await fetch(`${baseUrl()}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: authHeader(),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      status_code?: string;
      status_message?: string;
    };
    const statusCode = Number(payload.status_code ?? response.status);

    if (!response.ok || (statusCode !== 200 && statusCode !== 201)) {
      throw new AppError(502, 'Layanan Midtrans sedang tidak tersedia', {
        code: 'SERVER',
        details: { status: response.status },
      });
    }

    return payload as T;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(502, 'Layanan Midtrans sedang tidak tersedia', { code: 'SERVER' });
  }
}

export async function chargeMidtrans(params: {
  externalOrderId: string;
  amount: number;
  method: 'BCA' | 'BNI' | 'MANDIRI';
  customer: { name: string; email: string; phone: string };
}): Promise<MidtransChargeResult> {
  const transactionDetails = {
    order_id: params.externalOrderId,
    gross_amount: params.amount,
  };
  const customerDetails = {
    first_name: params.customer.name,
    email: params.customer.email,
    phone: params.customer.phone,
  };
  const body =
    params.method === 'MANDIRI'
      ? {
          payment_type: 'echannel',
          transaction_details: transactionDetails,
          echannel: {
            bill_info1: 'Pembayaran:',
            bill_info2: 'Belanja Schoolyshop',
          },
          customer_details: customerDetails,
          custom_expiry: { expiry_duration: DEFAULT_EXPIRY_HOURS, unit: 'hour' },
        }
      : {
          payment_type: 'bank_transfer',
          transaction_details: transactionDetails,
          bank_transfer: { bank: params.method.toLowerCase() },
          customer_details: customerDetails,
          custom_expiry: { expiry_duration: DEFAULT_EXPIRY_HOURS, unit: 'hour' },
        };

  const data = await midtransRequest<MidtransChargeResponse>('/v2/charge', body);
  const vaNumber =
    data.va_numbers?.[0]?.va_number ??
    data.permata_va_number ??
    data.bill_key;

  if (!vaNumber || !data.transaction_id) {
    throw new AppError(502, 'Respons Midtrans tidak lengkap', { code: 'SERVER' });
  }

  return {
    externalId: data.transaction_id,
    vaNumber,
    billerCode: data.biller_code ?? null,
    methodLabel:
      params.method === 'MANDIRI'
        ? 'Mandiri Bill'
        : `Virtual Account ${params.method}`,
    expiresAt: parseExpiry(data.expiry_time),
  };
}

export function verifyMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signature: string;
}): boolean {
  if (!env.MIDTRANS_SERVER_KEY || !params.signature) {
    return false;
  }

  const expected = createHash('sha512')
    .update(
      `${params.orderId}${params.statusCode}${params.grossAmount}${env.MIDTRANS_SERVER_KEY}`,
    )
    .digest('hex');
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(params.signature);

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}
