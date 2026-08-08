import pg from 'pg';
import { config } from './config.js';

// Our BIGINT ids and cent amounts are far below Number.MAX_SAFE_INTEGER, so
// parse int8 as number instead of pg's default string.
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: config.poolMax,
});

// An idle client losing its connection (e.g. Postgres restart) emits 'error';
// without a listener that is an uncaught exception that kills the process.
pool.on('error', (err) => {
  console.error('pg pool: idle client error:', err.message);
});

// Runs fn inside a transaction; commits on success, rolls back on any throw.
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
