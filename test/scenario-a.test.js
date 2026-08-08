import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/platform/db.js';
import { resetDb, startServer, jfetch, holdBody } from './helpers.js';

before(async () => {
  await resetDb();
});

after(async () => {
  await pool.end();
});

// OFFICIAL SCENARIO A: one showtime, one exact seat, 100 concurrent holds.
// Real HTTP requests against a listening server, contending on one real
// PostgreSQL row. Expected: 1 success, 99 clean rejections, 0 oversell.
test('Scenario A: 100 concurrent holds for the SAME seat — exactly one wins', async (t) => {
  const { baseUrl } = await startServer(t);
  const SHOW_ID = 1;
  const SEAT_ID = 1001; // seat A1 of screen 1

  const requests = Array.from({ length: 100 }, (_, i) =>
    jfetch(baseUrl, `/api/shows/${SHOW_ID}/hold`, {
      method: 'POST',
      body: holdBody([SEAT_ID], `burst-user-${i}`),
    })
  );
  const results = await Promise.all(requests);

  const wins = results.filter((r) => r.status === 201);
  const rejections = results.filter(
    (r) => r.status === 409 && r.body?.error === 'SEAT_UNAVAILABLE'
  );
  const other = results.filter((r) => r.status !== 201 && r.status !== 409);

  assert.equal(results.length, 100, 'requests sent');
  assert.equal(wins.length, 1, `successful holds (got ${wins.length})`);
  assert.equal(rejections.length, 99, `clean 409 rejections (got ${rejections.length})`);
  assert.equal(other.length, 0, `unexpected responses: ${JSON.stringify(other.slice(0, 3))}`);

  // Database truth: the row is HELD exactly once, by the winner's booking.
  const row = await pool.query(
    'SELECT status, booking_id FROM show_seats WHERE show_id = $1 AND seat_id = $2',
    [SHOW_ID, SEAT_ID]
  );
  assert.equal(row.rows[0].status, 'HELD');
  assert.equal(row.rows[0].booking_id, wins[0].body.booking_id);

  const bookings = await pool.query(
    `SELECT count(*)::int AS c FROM bookings WHERE show_id = $1 AND status = 'HELD'`,
    [SHOW_ID]
  );
  assert.equal(bookings.rows[0].c, 1, 'exactly one HELD booking exists');

  // Seat-map truth: the seat reports HELD.
  const map = await jfetch(baseUrl, `/api/shows/${SHOW_ID}/seats`);
  const seat = map.body.seats.find((s) => s.seat_id === SEAT_ID);
  assert.equal(seat.status, 'HELD');
  assert.equal(map.body.summary.held, 1);
});
