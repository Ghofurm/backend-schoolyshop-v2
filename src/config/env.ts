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
});
