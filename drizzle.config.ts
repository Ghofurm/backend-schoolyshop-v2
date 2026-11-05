import { env } from './src/config/env.js';
import { defineConfig } from 'drizzle-kit';

const directUrl = env.DATABASE_URL_DIRECT || env.DATABASE_URL;

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: directUrl
    ? { url: directUrl }
    : {
        host: env.DB_HOST,
        port: env.DB_PORT,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
        ssl: env.DB_SSL,
      },
  verbose: true,
  strict: true,
});
