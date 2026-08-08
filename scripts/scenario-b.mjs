#!/usr/bin/env node
// OFFICIAL SCENARIO B evidence script — abandoned hold. Run against a stack
// started with a SHORT TTL, e.g.:
//   HOLD_TTL_SECONDS=5 docker compose up -d
//   BASE_URL=http://localhost:3000 node scripts/scenario-b.mjs
// Flow: User A holds → never pays → hold expires → seat AVAILABLE →
// User B successfully holds the same seat.

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const SHOW_ID = Number(process.env.SHOW_ID ?? 1);
const MAX_TTL = Number(process.env.MAX_TTL ?? 30);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ts = () => new Date().toISOString();

async function jfetch(path, opts = {}) {
  const res = await fetch(BASE_URL + path, {
    ...opts,
    headers: opts.body
      ? { 'content-type': 'application/json', ...opts.headers }
      : opts.headers,
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    // ignore
  }
  return { status: res.status, body };
}

function fail(msg) {
  console.error(`\nRESULT: FAIL — ${msg}`);
  process.exit(1);
}

function step(msg) {
  console.log(`[${ts()}] ${msg}`);
}

async function seatStatus(seatId) {
  const map = await jfetch(`/api/shows/${SHOW_ID}/seats`);
  return map.body?.seats?.find((s) => s.seat_id === seatId)?.status;
}

console.log('SCENARIO B — ABANDONED HOLD EXPIRES AND THE SEAT IS RECLAIMED');
console.log(`base_url: ${BASE_URL}\n`);

// The effective TTL is whatever the stack was started with (HOOK 2).
const cfg = await jfetch('/api/config');
if (cfg.status !== 200) fail(`/api/config returned ${cfg.status}`);
const ttl = cfg.body.hold_ttl_seconds;
step(`stack reports HOLD_TTL_SECONDS=${ttl} (from environment)`);
if (ttl > MAX_TTL) {
  fail(
    `HOLD_TTL_SECONDS=${ttl} is too long for this drill — restart the stack ` +
      `with a short value, e.g. HOLD_TTL_SECONDS=5 docker compose up -d`
  );
}

let seatId = process.env.SEAT_ID ? Number(process.env.SEAT_ID) : null;
if (!seatId) {
  const map = await jfetch(`/api/shows/${SHOW_ID}/seats`);
  const free = map.body.seats.find((s) => s.status === 'AVAILABLE');
  if (!free) fail('no AVAILABLE seat in this show');
  seatId = free.seat_id;
}
step(`target: show ${SHOW_ID}, seat ${seatId}`);

const holdA = await jfetch(`/api/shows/${SHOW_ID}/hold`, {
  method: 'POST',
  body: JSON.stringify({
    seat_ids: [seatId],
    customer_name: 'User A',
    customer_phone: '01700000001',
  }),
});
if (holdA.status !== 201) fail(`User A hold returned ${holdA.status}`);
step(`User A holds the seat: ${holdA.body.booking_ref} (expires ${holdA.body.hold_expires_at})`);

const blocked = await jfetch(`/api/shows/${SHOW_ID}/hold`, {
  method: 'POST',
  body: JSON.stringify({
    seat_ids: [seatId],
    customer_name: 'User B',
    customer_phone: '01700000002',
  }),
});
if (blocked.status !== 409) fail(`live hold not protected: User B got ${blocked.status}`);
step(`User B is cleanly rejected while the hold is live (409 ${blocked.body?.error})`);

if ((await seatStatus(seatId)) !== 'HELD') fail('seat map does not show HELD');
step('seat map shows the seat as HELD');

const waitMs = ttl * 1000 + 3000;
step(`User A never pays; waiting ${waitMs / 1000}s for expiry (TTL ${ttl}s + margin)…`);
await sleep(waitMs);

const afterExpiry = await seatStatus(seatId);
if (afterExpiry !== 'AVAILABLE') fail(`after TTL the seat map shows ${afterExpiry}, expected AVAILABLE`);
step('hold expired: seat map shows the seat as AVAILABLE again');

const bookingA = await jfetch(`/api/bookings/${holdA.body.booking_ref}`);
step(`User A's booking now reads: ${bookingA.body?.status}`);
if (bookingA.body?.status !== 'EXPIRED') fail(`booking A is ${bookingA.body?.status}, expected EXPIRED`);

const holdB = await jfetch(`/api/shows/${SHOW_ID}/hold`, {
  method: 'POST',
  body: JSON.stringify({
    seat_ids: [seatId],
    customer_name: 'User B',
    customer_phone: '01700000002',
  }),
});
if (holdB.status !== 201) fail(`User B could not reclaim the seat: ${holdB.status}`);
step(`User B successfully holds the same seat: ${holdB.body.booking_ref}`);

if ((await seatStatus(seatId)) !== 'HELD') fail('seat map does not show User B\'s hold');
step('seat map shows the seat as HELD by User B');

console.log('\nTIMELINE VERIFIED:');
console.log(`  HOLD_TTL_SECONDS:  ${ttl} (environment-driven)`);
console.log(`  initial hold:      ${holdA.body.booking_ref} (User A)`);
console.log(`  expiry:            observed via seat map + booking status EXPIRED`);
console.log(`  reclaim:           ${holdB.body.booking_ref} (User B) on the same seat`);
console.log('\nRESULT: PASS — abandoned hold released and reclaimed by another user');
