import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/platform/db.js';
import { resetDb, startServer, jfetch, holdBody } from './helpers.js';

// Seat id scheme from db/seed.sql: screen_id*1000 + (row-1)*cols + col.
// Show 1 runs on screen 1 → seats 1001..1080. Each test uses its own seats.

before(async () => {
  await resetDb();
});

after(async () => {
  await pool.end();
});

test('GET /health returns 200 in under one second with no dependencies', async (t) => {
  const { baseUrl } = await startServer(t);
  const t0 = performance.now();
  const res = await jfetch(baseUrl, '/health');
  const elapsedMs = performance.now() - t0;
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: 'ok' });
  assert.ok(elapsedMs < 1000, `took ${elapsedMs}ms`);
});

test('GET /ready pings the database', async (t) => {
  const { baseUrl } = await startServer(t);
  const res = await jfetch(baseUrl, '/ready');
  assert.equal(res.status, 200);
});

test('catalog: movies, theatres, shows are browsable with seeded data', async (t) => {
  const { baseUrl } = await startServer(t);

  const movies = await jfetch(baseUrl, '/api/movies');
  assert.equal(movies.status, 200);
  assert.equal(movies.body.movies.length, 4);
  assert.ok(movies.body.movies[0].title);

  const theatres = await jfetch(baseUrl, '/api/theatres');
  assert.equal(theatres.status, 200);
  assert.equal(theatres.body.theatres.length, 2);

  const shows = await jfetch(baseUrl, '/api/shows');
  assert.equal(shows.status, 200);
  assert.equal(shows.body.shows.length, 12);
  const s = shows.body.shows[0];
  for (const k of ['id', 'movie_title', 'theatre_name', 'screen_name', 'starts_at', 'price_cents']) {
    assert.ok(k in s, `show is missing ${k}`);
  }
});

test('seat map: 80 seats for show 1, consistent summary, 404/400 on bad ids', async (t) => {
  const { baseUrl } = await startServer(t);

  const map = await jfetch(baseUrl, '/api/shows/1/seats');
  assert.equal(map.status, 200);
  assert.equal(map.body.seats.length, 80);
  const sum = map.body.summary;
  assert.equal(sum.available + sum.held + sum.booked, 80);

  assert.equal((await jfetch(baseUrl, '/api/shows/999/seats')).status, 404);
  assert.equal((await jfetch(baseUrl, '/api/shows/abc/seats')).status, 400);
});

test('hold: claims a seat, reflects in seat map and booking lookup', async (t) => {
  const { baseUrl } = await startServer(t);

  const hold = await jfetch(baseUrl, '/api/shows/1/hold', {
    method: 'POST',
    body: holdBody([1010], 'Alice'),
  });
  assert.equal(hold.status, 201);
  assert.equal(hold.body.status, 'HELD');
  assert.deepEqual(hold.body.seat_ids, [1010]);
  assert.ok(hold.body.booking_ref.startsWith('bk_'));
  assert.ok(hold.body.hold_expires_at);
  assert.equal(hold.body.amount_cents, 45000);

  const map = await jfetch(baseUrl, '/api/shows/1/seats');
  const seat = map.body.seats.find((s) => s.seat_id === 1010);
  assert.equal(seat.status, 'HELD');

  const booking = await jfetch(baseUrl, `/api/bookings/${hold.body.booking_ref}`);
  assert.equal(booking.status, 200);
  assert.equal(booking.body.status, 'HELD');
  assert.deepEqual(booking.body.seat_ids, [1010]);
  assert.equal(booking.body.otp_verified, false);
  assert.equal(booking.body.payment, null);
});

test('hold: second request for the same seat is cleanly rejected', async (t) => {
  const { baseUrl } = await startServer(t);

  const first = await jfetch(baseUrl, '/api/shows/1/hold', {
    method: 'POST',
    body: holdBody([1011]),
  });
  assert.equal(first.status, 201);

  const second = await jfetch(baseUrl, '/api/shows/1/hold', {
    method: 'POST',
    body: holdBody([1011]),
  });
  assert.equal(second.status, 409);
  assert.equal(second.body.error, 'SEAT_UNAVAILABLE');
  assert.deepEqual(second.body.unavailable_seat_ids, [1011]);
});

test('hold: unknown seats and bad payloads are rejected without side effects', async (t) => {
  const { baseUrl } = await startServer(t);

  const unknown = await jfetch(baseUrl, '/api/shows/1/hold', {
    method: 'POST',
    body: holdBody([999999]),
  });
  assert.equal(unknown.status, 400);
  assert.equal(unknown.body.error, 'UNKNOWN_SEATS');

  // Seat 2001 belongs to screen 2, not to show 1's screen.
  const wrongScreen = await jfetch(baseUrl, '/api/shows/1/hold', {
    method: 'POST',
    body: holdBody([2001]),
  });
  assert.equal(wrongScreen.status, 400);

  const empty = await jfetch(baseUrl, '/api/shows/1/hold', {
    method: 'POST',
    body: holdBody([]),
  });
  assert.equal(empty.status, 400);

  const noName = await jfetch(baseUrl, '/api/shows/1/hold', {
    method: 'POST',
    body: { seat_ids: [1012], customer_phone: '017' },
  });
  assert.equal(noName.status, 400);

  assert.equal((await jfetch(baseUrl, '/api/shows/999/hold', {
    method: 'POST',
    body: holdBody([1001]),
  })).status, 404);
});

test('multi-seat hold is all-or-nothing: one taken seat fails the whole request', async (t) => {
  const { baseUrl } = await startServer(t);

  const taken = await jfetch(baseUrl, '/api/shows/1/hold', {
    method: 'POST',
    body: holdBody([1021]),
  });
  assert.equal(taken.status, 201);

  const multi = await jfetch(baseUrl, '/api/shows/1/hold', {
    method: 'POST',
    body: holdBody([1020, 1021, 1022]),
  });
  assert.equal(multi.status, 409);
  assert.deepEqual(multi.body.unavailable_seat_ids, [1021]);

  // The two free seats must NOT have been partially claimed.
  const { rows } = await pool.query(
    `SELECT seat_id, status FROM show_seats
      WHERE show_id = 1 AND seat_id IN (1020, 1022) ORDER BY seat_id`
  );
  assert.deepEqual(rows.map((r) => r.status), ['AVAILABLE', 'AVAILABLE']);
});

test('concurrent overlapping multi-seat holds: exactly one wins, no partial claims, no deadlock', async (t) => {
  const { baseUrl } = await startServer(t);

  // Overlap on 1032; reversed request order exercises deterministic locking.
  const [a, b] = await Promise.all([
    jfetch(baseUrl, '/api/shows/1/hold', { method: 'POST', body: holdBody([1031, 1032], 'A') }),
    jfetch(baseUrl, '/api/shows/1/hold', { method: 'POST', body: holdBody([1033, 1032], 'B') }),
  ]);
  const statuses = [a.status, b.status].sort();
  assert.deepEqual(statuses, [201, 409]);

  const winner = a.status === 201 ? a : b;
  const { rows } = await pool.query(
    `SELECT seat_id, status, booking_id FROM show_seats
      WHERE show_id = 1 AND seat_id IN (1031, 1032, 1033) ORDER BY seat_id`
  );
  const held = rows.filter((r) => r.status === 'HELD');
  assert.equal(held.length, 2, 'only the winner pair is held');
  assert.ok(held.every((r) => r.booking_id === winner.body.booking_id));
});

test('pay without OTP verification is refused (no gateway involved)', async (t) => {
  const { baseUrl } = await startServer(t);

  const hold = await jfetch(baseUrl, '/api/shows/1/hold', {
    method: 'POST',
    body: holdBody([1040]),
  });
  assert.equal(hold.status, 201);

  const pay = await jfetch(baseUrl, `/api/bookings/${hold.body.booking_ref}/pay`, {
    method: 'POST',
    body: {},
  });
  assert.equal(pay.status, 403);
  assert.equal(pay.body.error, 'OTP_REQUIRED');
});

test('OTP endpoints degrade to 503 when the gateway is unreachable', async (t) => {
  const { baseUrl } = await startServer(t);
  const prev = process.env.GATEWAY_URL;
  process.env.GATEWAY_URL = 'http://127.0.0.1:59999';
  t.after(() => {
    if (prev === undefined) delete process.env.GATEWAY_URL;
    else process.env.GATEWAY_URL = prev;
  });

  const hold = await jfetch(baseUrl, '/api/shows/1/hold', {
    method: 'POST',
    body: holdBody([1041]),
  });
  const send = await jfetch(baseUrl, `/api/bookings/${hold.body.booking_ref}/otp/send`, {
    method: 'POST',
    body: {},
  });
  assert.equal(send.status, 503);
  assert.equal(send.body.error, 'GATEWAY_UNAVAILABLE');
});

test('payment callback: unknown ref, duplicates and malformed bodies are all acknowledged', async (t) => {
  const { baseUrl } = await startServer(t);

  const event = {
    event_id: 'evt_test_dup_1',
    payment_id: 'pay_x',
    booking_ref: 'bk_does_not_exist-a1',
    status: 'SUCCEEDED',
    amount: 450,
    currency: 'BDT',
  };

  const first = await jfetch(baseUrl, '/api/payments/callback', {
    method: 'POST',
    body: event,
  });
  assert.equal(first.status, 200);

  const dup = await jfetch(baseUrl, '/api/payments/callback', {
    method: 'POST',
    body: event,
  });
  assert.equal(dup.status, 200);
  assert.equal(dup.body.note, 'duplicate');

  const events = await pool.query(
    "SELECT count(*)::int AS c FROM payment_events WHERE event_id = 'evt_test_dup_1'"
  );
  assert.equal(events.rows[0].c, 1);

  const malformed = await fetch(baseUrl + '/api/payments/callback', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{not json',
  });
  assert.equal(malformed.status, 200);
});

test('GET /api/bookings/:ref returns 404 for unknown refs', async (t) => {
  const { baseUrl } = await startServer(t);
  assert.equal((await jfetch(baseUrl, '/api/bookings/bk_nope')).status, 404);
});
