import { sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { env } from '../config/env.js';

export type DatabaseStatus = 'connected' | 'disconnected';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  environment: string;
  database: DatabaseStatus;
  uptime: number;
  timestamp: string;
}

export async function getHealthStatus(): Promise<HealthStatus> {
  let database: DatabaseStatus = 'connected';

  try {
    await db.execute(sql`select 1`);
  } catch {
    database = 'disconnected';
  }

  return {
    status: database === 'connected' ? 'ok' : 'degraded',
    environment: env.NODE_ENV,
    database,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}
