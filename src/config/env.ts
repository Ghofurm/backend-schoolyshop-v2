import 'dotenv/config';

const ENVIRONMENTS = ['development', 'test', 'production'] as const;

export type Environment = (typeof ENVIRONMENTS)[number];

function requireEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readPort(name: string, fallback: number): number {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Environment variable ${name} must be a valid port (1-65535)`);
  }

  return port;
}

function readEnvironment(): Environment {
  const value = process.env.NODE_ENV ?? 'development';

  if (!ENVIRONMENTS.includes(value as Environment)) {
    throw new Error(
      `Environment variable NODE_ENV must be one of: ${ENVIRONMENTS.join(', ')}`,
    );
  }

  return value as Environment;
}

function readList(name: string, fallback: string[]): string[] {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : fallback;
}

function readOptional(name: string, fallback = ''): string {
  const value = process.env[name];

  return value === undefined || value.trim() === '' ? fallback : value.trim();
}

function readBoolean(name: string, fallback = false): boolean {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (!['true', 'false', '1', '0'].includes(normalized)) {
    throw new Error(`Environment variable ${name} must be true or false`);
  }

  return normalized === 'true' || normalized === '1';
}

export const env = Object.freeze({
  NODE_ENV: readEnvironment(),
  PORT: readPort('PORT', 3000),
  FRONTEND_ORIGINS: readList('FRONTEND_ORIGINS', ['http://localhost:5173']),
  DB_HOST: requireEnv('DB_HOST'),
  DB_PORT: readPort('DB_PORT', 5432),
  DB_USER: requireEnv('DB_USER'),
  DB_PASSWORD: requireEnv('DB_PASSWORD'),
  DB_NAME: requireEnv('DB_NAME'),
  DB_SSL: readBoolean('DB_SSL'),
  BITESHIP_API_KEY: readOptional('BITESHIP_API_KEY'),
  BITESHIP_BASE_URL: readOptional('BITESHIP_BASE_URL', 'https://api.biteship.com'),
  BITESHIP_ORIGIN_AREA_ID: readOptional('BITESHIP_ORIGIN_AREA_ID'),
  BITESHIP_ORIGIN_POSTAL_CODE: readOptional('BITESHIP_ORIGIN_POSTAL_CODE'),
  BITESHIP_ORIGIN_CONTACT_NAME: readOptional('BITESHIP_ORIGIN_CONTACT_NAME', 'Koperasi Sekolah'),
  BITESHIP_ORIGIN_CONTACT_PHONE: readOptional('BITESHIP_ORIGIN_CONTACT_PHONE', '081200000000'),
  BITESHIP_ORIGIN_ADDRESS: readOptional('BITESHIP_ORIGIN_ADDRESS', 'Koperasi Sekolah'),
  BITESHIP_COURIERS: readList('BITESHIP_COURIERS', ['jne', 'sicepat', 'jnt', 'anteraja']),
  BITESHIP_WEBHOOK_HEADER_KEY: readOptional(
    'BITESHIP_WEBHOOK_HEADER_KEY',
    'x-biteship-webhook-secret',
  ),
  BITESHIP_WEBHOOK_SECRET: readOptional('BITESHIP_WEBHOOK_SECRET'),
});
