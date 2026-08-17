import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { pool } from '../src/platform/db.js';
import { sweepExpired } from '../src/booking/sweeper.js';
import { resetDb, startServer, jfetch, holdBody } from './helpers.js';

before(async () => {
  await resetDb();
});

after(async () => {
  await pool.end();
});

// OFFICIAL SCENARIO B: hold → no payment → TTL expires → seat AVAILABLE →
// a different user claims it. HOLD_TTL_SECONDS comes from the environment.
test('Scenario B: an abandoned hold expires and another user reclaims the seat', async (t) => {
  const prevTtl = process.env.HOLD_TTL_SECONDS;
  process.env.HOLD_TTL_SECONDS = '2';
  t.after(() => {
    if (prevTtl === undefined) delete process.env.HOLD_TTL_SECONDS;
    else process.env.HOLD_TTL_SECONDS = prevTtl;
  });

  const { baseUrl } = await startServer(t);
  const SHOW_ID = 1;
  const SEAT_ID = 1002;

  // User A holds and never pays.
  const holdA = await jfetch(baseUrl, `/api/shows/${SHOW_ID}/hold`, {
    method: 'POST',
    body: holdBody([SEAT_ID], 'User A'),
  });
  assert.equal(holdA.status, 201);
  assert.equal(holdA.body.hold_ttl_seconds, 2, 'TTL came from the environment');

  // While the hold is live the seat is taken.
  const blocked = await jfetch(baseUrl, `/api/shows/${SHOW_ID}/hold`, {
    method: 'POST',
    body: holdBody([SEAT_ID], 'User B'),
  });
  assert.equal(blocked.status, 409);
  let map = await jfetch(baseUrl, `/api/shows/${SHOW_ID}/seats`);
  assert.equal(map.body.seats.find((s) => s.seat_id === SEAT_ID).status, 'HELD');

  await sleep(2600);

  // Lazy expiry: AVAILABLE in the seat map even before any sweeper runs.
  map = await jfetch(baseUrl, `/api/shows/${SHOW_ID}/seats`);
  assert.equal(map.body.seats.find((s) => s.seat_id === SEAT_ID).status, 'AVAILABLE');

  // The abandoned booking reads as EXPIRED.
  const bookingA = await jfetch(baseUrl, `/api/bookings/${holdA.body.booking_ref}`);
  assert.equal(bookingA.body.status, 'EXPIRED');

  const beforeRow = await pool.query(
    'SELECT status, booking_id, hold_expires_at, (hold_expires_at <= now()) AS expired FROM show_seats WHERE show_id = $1 AND seat_id = $2',
    [SHOW_ID, SEAT_ID]
  );
  console.log('BEFORE SWEEP ROW:', beforeRow.rows[0]);

  // The sweeper physically materializes the release.
  const swept = await sweepExpired();
  console.log('SWEPT RESULT:', swept);

  const afterRow = await pool.query(
    'SELECT status, booking_id, hold_expires_at FROM show_seats WHERE show_id = $1 AND seat_id = $2',
    [SHOW_ID, SEAT_ID]
  );
  console.log('AFTER SWEEP ROW:', afterRow.rows[0]);

  assert.ok(swept.seatsReleased >= 1, 'sweeper released the expired seat');
  const row = await pool.query(
    'SELECT status, booking_id, hold_expires_at FROM show_seats WHERE show_id = $1 AND seat_id = $2',
    [SHOW_ID, SEAT_ID]
  );
  assert.deepEqual(
    { status: row.rows[0].status, booking_id: row.rows[0].booking_id, hold_expires_at: row.rows[0].hold_expires_at },
    { status: 'AVAILABLE', booking_id: null, hold_expires_at: null }
  );
  const bookingRowA = await pool.query(
    'SELECT status FROM bookings WHERE ref = $1',
    [holdA.body.booking_ref]
  );
  assert.equal(bookingRowA.rows[0].status, 'EXPIRED');

  // User B now claims the same seat successfully.
  const holdB = await jfetch(baseUrl, `/api/shows/${SHOW_ID}/hold`, {
    method: 'POST',
    body: holdBody([SEAT_ID], 'User B'),
  });
  assert.equal(holdB.status, 201);
  assert.notEqual(holdB.body.booking_ref, holdA.body.booking_ref);

  const finalRow = await pool.query(
    'SELECT status, booking_id FROM show_seats WHERE show_id = $1 AND seat_id = $2',
    [SHOW_ID, SEAT_ID]
  );
  assert.equal(finalRow.rows[0].status, 'HELD');
  assert.equal(finalRow.rows[0].booking_id, holdB.body.booking_id);
});

// Lazy reclaim also works with NO sweeper: a new hold takes an expired seat
// directly inside its own transaction.
test('an expired hold can be reclaimed directly by a new hold (no sweeper)', async (t) => {
  const prevTtl = process.env.HOLD_TTL_SECONDS;
  process.env.HOLD_TTL_SECONDS = '1';
  t.after(() => {
    if (prevTtl === undefined) delete process.env.HOLD_TTL_SECONDS;
    else process.env.HOLD_TTL_SECONDS = prevTtl;
  });

  const { baseUrl } = await startServer(t);
  const SEAT_ID = 1003;

  const holdA = await jfetch(baseUrl, '/api/shows/1/hold', {
    method: 'POST',
    body: holdBody([SEAT_ID], 'User A'),
  });
  assert.equal(holdA.status, 201);

  await sleep(1400);

  const holdB = await jfetch(baseUrl, '/api/shows/1/hold', {
    method: 'POST',
    body: holdBody([SEAT_ID], 'User B'),
  });
  assert.equal(holdB.status, 201, 'expired hold reclaimed without a sweeper');

  const row = await pool.query(
    'SELECT booking_id FROM show_seats WHERE show_id = 1 AND seat_id = $1',
    [SEAT_ID]
  );
  assert.equal(row.rows[0].booking_id, holdB.body.booking_id);
});
