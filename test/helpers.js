import { pool } from '../src/platform/db.js';
import { migrateAndSeed } from '../src/platform/migrate.js';
import { buildApp } from '../src/app.js';

// Integration tests run against a REAL PostgreSQL (compose `db` on
// localhost:5433 locally, the service container in CI). Never a fake.
export async function resetDb() {
  try {
    await migrateAndSeed();
  } catch (err) {
    throw new Error(
      `Cannot reach PostgreSQL at ${process.env.DATABASE_URL ?? 'localhost:5433 (default)'} — ` +
        `start it first (e.g. "docker compose up -d db"). Original error: ${err.message}`
    );
  }
  // Wipe booking state so reruns are deterministic. FK order matters:
  // bookings ⇄ payments are circular via active_payment_id.
  await pool.query('UPDATE bookings SET active_payment_id = NULL');
  await pool.query('DELETE FROM payment_events');
  await pool.query('DELETE FROM payments');
  await pool.query(
    `UPDATE show_seats
        SET status = 'AVAILABLE', booking_id = NULL, hold_expires_at = NULL
      WHERE status <> 'AVAILABLE' OR booking_id IS NOT NULL`
  );
  await pool.query('DELETE FROM bookings');
}

export async function startServer(t) {
  const app = buildApp({ logger: false });
  await app.listen({ port: 0, host: '127.0.0.1' });
  t.after(() => app.close());
  const { port } = app.server.address();
  return { app, baseUrl: `http://127.0.0.1:${port}` };
}

export async function jfetch(baseUrl, path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(baseUrl + path, {
    method,
    headers: body ? { 'content-type': 'application/json', ...headers } : headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // ignore non-JSON
  }
  return { status: res.status, body: json };
}

export function holdBody(seatIds, name = 'Test User') {
  return {
    seat_ids: seatIds,
    customer_name: name,
    customer_phone: '01700000000',
  };
}
