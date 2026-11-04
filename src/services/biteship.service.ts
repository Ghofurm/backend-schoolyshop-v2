import { env } from '../config/env.js';
import { AppError } from '../utils/httpError.js';

export interface BiteshipRate {
  id: string;
  code: string;
  courier: string;
  service: string;
  description: string;
  price: number;
  eta: string;
  badge: string | null;
  courierCode: string;
  courierType: string;
}

export interface BiteshipArea {
  id: string;
  name: string;
  province: string | null;
  city: string | null;
  district: string | null;
  postalCode: string | null;
}

export interface BiteshipOrderItem {
  name: string;
  description: string;
  value: number;
  quantity: number;
  weight: number;
}

interface BiteshipPricing {
  courier_code: string;
  courier_name: string;
  courier_service_name: string;
  courier_service_code?: string;
  description?: string;
  duration?: string;
  price: number;
  type?: string;
}

interface BiteshipRatesResponse {
  pricing?: BiteshipPricing[];
}

interface BiteshipAreaResponse {
  id: string;
  name: string;
  administrative_division_level_1_name?: string;
  administrative_division_level_2_name?: string;
  administrative_division_level_3_name?: string;
  postal_code?: number;
}

export interface BiteshipOrderResponse {
  id: string;
  status: string;
  price?: number;
  courier?: {
    tracking_id?: string;
    waybill_id?: string;
    company?: string;
    type?: string;
  };
}

export function isBiteshipEnabled(): boolean {
  return env.BITESHIP_API_KEY.length > 0;
}

function originConfig() {
  if (!env.BITESHIP_ORIGIN_AREA_ID && !env.BITESHIP_ORIGIN_POSTAL_CODE) {
    throw new AppError(502, 'Konfigurasi origin Biteship belum lengkap', { code: 'SERVER' });
  }

  return env.BITESHIP_ORIGIN_AREA_ID
    ? { origin_area_id: env.BITESHIP_ORIGIN_AREA_ID }
    : { origin_postal_code: Number(env.BITESHIP_ORIGIN_POSTAL_CODE) };
}

async function biteshipRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(`${env.BITESHIP_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: env.BITESHIP_API_KEY,
        'Content-Type': 'application/json',
        ...init.headers,
      },
      signal: AbortSignal.timeout(15_000),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
      message?: string;
    };

    if (!response.ok || payload.success === false) {
      throw new AppError(502, 'Layanan Biteship sedang tidak tersedia', {
        code: 'SERVER',
        details: { status: response.status },
      });
    }

    return payload as T;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(502, 'Layanan Biteship sedang tidak tersedia', { code: 'SERVER' });
  }
}

export async function getBiteshipRates(params: {
  destinationAreaId: string;
  weight: number;
  couriers?: string[];
}): Promise<BiteshipRate[]> {
  const data = await biteshipRequest<BiteshipRatesResponse>('/v1/rates/couriers', {
    method: 'POST',
    body: JSON.stringify({
      ...originConfig(),
      destination_area_id: params.destinationAreaId,
      couriers: (params.couriers?.length ? params.couriers : env.BITESHIP_COURIERS).join(','),
      items: [
        {
          name: 'Paket Schoolyshop',
          description: 'Paket belanja sekolah',
          value: 100000,
          quantity: 1,
          weight: Math.max(1, Math.round(params.weight)),
        },
      ],
    }),
  });

  const rates = (data.pricing ?? []).map((pricing) => {
    const courierType = pricing.type ?? pricing.courier_service_code ?? 'reg';
    const id = `${pricing.courier_code}-${courierType}`;

    return {
      id,
      code: id,
      courier: pricing.courier_name,
      service: pricing.courier_service_name,
      description: pricing.description ?? pricing.duration ?? '',
      price: pricing.price,
      eta: pricing.duration ?? '',
      badge: null as string | null,
      courierCode: pricing.courier_code,
      courierType,
    };
  });

  if (rates.length > 0) {
    const cheapest = Math.min(...rates.map((rate) => rate.price));
    for (const rate of rates) {
      if (rate.price === cheapest) {
        rate.badge = 'Termurah';
        break;
      }
    }
  }

  return rates;
}

export async function resolveBiteshipRate(
  destinationAreaId: string,
  weight: number,
  rateId: string,
  service?: string,
): Promise<BiteshipRate> {
  const rates = await getBiteshipRates({ destinationAreaId, weight });
  const needle = rateId.trim().toUpperCase();
  const serviceNeedle = service?.trim().toUpperCase();
  const rate = rates.find((item) => {
    const matchesRate =
      item.id.toUpperCase() === needle ||
      item.code.toUpperCase() === needle ||
      needle.includes(item.courier.toUpperCase());
    const matchesService =
      serviceNeedle === undefined ||
      item.service.toUpperCase().includes(serviceNeedle);

    return matchesRate && matchesService;
  });

  if (!rate) {
    throw new AppError(422, 'Tarif pengiriman tidak ditemukan', {
      details: { fields: { shippingRateId: 'Pilih tarif dari GET /shipping/rates' } },
    });
  }

  return rate;
}

export async function searchBiteshipAreas(input: string): Promise<BiteshipArea[]> {
  if (!isBiteshipEnabled()) {
    return [];
  }

  const data = await biteshipRequest<{ areas?: BiteshipAreaResponse[] }>(
    `/v1/maps/areas?countries=ID&input=${encodeURIComponent(input)}&type=single`,
  );

  return (data.areas ?? []).map((area) => ({
    id: area.id,
    name: area.name,
    province: area.administrative_division_level_1_name ?? null,
    city: area.administrative_division_level_2_name ?? null,
    district: area.administrative_division_level_3_name ?? null,
    postalCode: area.postal_code === undefined ? null : String(area.postal_code),
  }));
}

export async function createBiteshipOrder(params: {
  orderId: number;
  destination: {
    name: string;
    phone: string;
    email: string;
    address: string;
    postalCode: string;
    areaId: string;
    note: string | null;
  };
  courierCompany: string;
  courierType: string;
  items: BiteshipOrderItem[];
}): Promise<BiteshipOrderResponse> {
  const origin = originConfig();

  return biteshipRequest<BiteshipOrderResponse>('/v1/orders', {
    method: 'POST',
    body: JSON.stringify({
      shipper_contact_name: env.BITESHIP_ORIGIN_CONTACT_NAME,
      shipper_contact_phone: env.BITESHIP_ORIGIN_CONTACT_PHONE,
      shipper_organization: 'Schoolyshop',
      origin_contact_name: env.BITESHIP_ORIGIN_CONTACT_NAME,
      origin_contact_phone: env.BITESHIP_ORIGIN_CONTACT_PHONE,
      origin_address: env.BITESHIP_ORIGIN_ADDRESS,
      ...origin,
      destination_contact_name: params.destination.name,
      destination_contact_phone: params.destination.phone,
      destination_contact_email: params.destination.email,
      destination_address: params.destination.address,
      destination_postal_code: Number(params.destination.postalCode),
      destination_area_id: params.destination.areaId,
      destination_note: params.destination.note ?? undefined,
      courier_company: params.courierCompany,
      courier_type: params.courierType,
      delivery_type: 'now',
      reference_id: `SCH-ORDER-${params.orderId}`,
      metadata: { orderId: params.orderId },
      items: params.items,
    }),
  });
}

export async function getBiteshipLabelUrl(orderId: string): Promise<string | null> {
  try {
    const data = await biteshipRequest<{
      shipping_label?: { file_url?: string };
    }>(`/v1/orders/${encodeURIComponent(orderId)}/shipping_labels`);

    return data.shipping_label?.file_url ?? null;
  } catch {
    return null;
  }
}
