import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/science_publication',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

import * as schema from './schema';

export const db = drizzle(pool, { schema });
export * from './schema';

process.on('SIGTERM', async () => {
  await pool.end();
});