import { db } from '../../config/database.js';
import { shippingRates } from '../schema.js';

const SHIPPING_RATES = [
  {
    code: 'jne-reguler',
    courier: 'JNE',
    service: 'Reguler',
    description: 'Estimasi tiba: Besok atau 1-2 Hari Kerja',
    price: 15000,
    eta: '1-2 hari kerja',
    badge: 'Termurah',
  },
  {
    code: 'sicepat-siuntung',
    courier: 'SiCepat',
    service: 'SIUNTUNG',
    description: 'Estimasi tiba: 1-2 Hari Kerja',
    price: 16500,
    eta: '1-2 hari kerja',
    badge: null,
  },
  {
    code: 'jnt-ez-reguler',
    courier: 'J&T',
    service: 'EZ Reguler',
    description: 'Estimasi tiba: 2-3 Hari Kerja',
    price: 18000,
    eta: '2-3 hari kerja',
    badge: null,
  },
  {
    code: 'anteraja-reguler',
    courier: 'AnterAja',
    service: 'Reguler Parcel',
    description: 'Estimasi tiba: 2-3 Hari Kerja',
    price: 17000,
    eta: '2-3 hari kerja',
    badge: null,
  },
];

export async function seedShippingRates(): Promise<void> {
  for (const rate of SHIPPING_RATES) {
    await db
      .insert(shippingRates)
      .values(rate)
      .onConflictDoUpdate({
        target: shippingRates.code,
        set: {
          courier: rate.courier,
          service: rate.service,
          description: rate.description,
          price: rate.price,
          eta: rate.eta,
          badge: rate.badge,
        },
      });
  }

  console.log(`Seeded ${SHIPPING_RATES.length} shipping rates`);
}
