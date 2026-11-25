import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/science_publication';
const isLocal = /localhost|127\.0\.0\.1/.test(dbUrl);
const pool = new Pool({
  connectionString: dbUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

import * as schema from './schema';

export const db = drizzle(pool, { schema });
export * from './schema';

process.on('SIGTERM', async () => {
  await pool.end();
});