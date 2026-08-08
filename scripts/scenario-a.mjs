#!/usr/bin/env node
// OFFICIAL SCENARIO A evidence script — run against a live stack:
//   BASE_URL=http://localhost:3000 node scripts/scenario-a.mjs
// One showtime, ONE exact seat, 100 concurrent hold requests in one burst.
// Expected: 1 success, 99 clean rejections, 0 oversell.

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const SHOW_ID = Number(process.env.SHOW_ID ?? 1);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 100);

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

const startedAt = new Date().toISOString();

// Pick the target seat: env override or the first AVAILABLE seat.
let seatId = process.env.SEAT_ID ? Number(process.env.SEAT_ID) : null;
const mapBefore = await jfetch(`/api/shows/${SHOW_ID}/seats`);
if (mapBefore.status !== 200) fail(`seat map fetch returned ${mapBefore.status}`);
if (!seatId) {
  const free = mapBefore.body.seats.find((s) => s.status === 'AVAILABLE');
  if (!free) fail('no AVAILABLE seat in this show');
  seatId = free.seat_id;
}

console.log('SCENARIO A — 100 CONCURRENT HOLDS FOR THE SAME EXACT SEAT');
console.log(`started_at: ${startedAt}`);
console.log(`base_url:   ${BASE_URL}`);
console.log(`show_id:    ${SHOW_ID}`);
console.log(`seat_id:    ${seatId}`);
console.log('');

// Build every request first, then fire them in a single burst.
const burst = Array.from({ length: CONCURRENCY }, (_, i) =>
  jfetch(`/api/shows/${SHOW_ID}/hold`, {
    method: 'POST',
    body: JSON.stringify({
      seat_ids: [seatId],
      customer_name: `burst-user-${i}`,
      customer_phone: '01700000000',
    }),
  })
);
const t0 = performance.now();
const results = await Promise.all(burst);
const elapsedMs = Math.round(performance.now() - t0);

const wins = results.filter((r) => r.status === 201);
const rejections = results.filter(
  (r) => r.status === 409 && r.body?.error === 'SEAT_UNAVAILABLE'
);
const other = results.filter((r) => r.status !== 201 && r.status !== 409);
const oversell = Math.max(0, wins.length - 1);

// Post-burst seat map verification.
const mapAfter = await jfetch(`/api/shows/${SHOW_ID}/seats`);
const seatAfter = mapAfter.body?.seats?.find((s) => s.seat_id === seatId);

console.log(`REQUESTS SENT:        ${results.length}`);
console.log(`SUCCESSFUL HOLDS:     ${wins.length}`);
console.log(`REJECTIONS (409):     ${rejections.length}`);
console.log(`OTHER RESPONSES:      ${other.length}${other.length ? ' ' + JSON.stringify(other.map((o) => o.status)) : ''}`);
console.log(`OVERSELL COUNT:       ${oversell}`);
console.log(`BURST WALL TIME:      ${elapsedMs} ms`);
console.log(`SEAT MAP AFTER BURST: seat ${seatId} = ${seatAfter?.status}`);
if (wins.length === 1) {
  console.log(`WINNER:               ${wins[0].body.booking_ref}`);
  const booking = await jfetch(`/api/bookings/${wins[0].body.booking_ref}`);
  console.log(`WINNER BOOKING:       status=${booking.body?.status} seats=[${booking.body?.seat_ids}]`);
}

if (wins.length !== 1) fail(`expected exactly 1 successful hold, got ${wins.length}`);
if (rejections.length !== CONCURRENCY - 1) fail(`expected ${CONCURRENCY - 1} clean rejections, got ${rejections.length}`);
if (other.length !== 0) fail('unexpected response statuses present');
if (seatAfter?.status !== 'HELD') fail(`seat map shows ${seatAfter?.status}, expected HELD`);

console.log('\nRESULT: PASS — exactly one hold succeeded, zero oversell');
