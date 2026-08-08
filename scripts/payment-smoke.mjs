#!/usr/bin/env node
// Payment-foundation smoke drill against the composed stack (app + db +
// PROVIDED gateway). Exercises the official X-Mock-* control headers:
//   deterministic happy path, force fail, force duplicate, force race,
//   force timeout + retry.
// Run: BASE_URL=http://localhost:3000 node scripts/payment-smoke.mjs

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const GATEWAY_DEBUG = process.env.GATEWAY_DEBUG_URL ?? 'http://localhost:9000';
const SHOW_ID = Number(process.env.SHOW_ID ?? 2);
const OTP_CODE = '123456'; // deterministic-mode OTP per the gateway reference

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ts = () => new Date().toISOString();
const DET = { 'x-mock-mode': 'deterministic' };

let failures = 0;

async function jfetch(base, path, opts = {}) {
  const res = await fetch(base + path, {
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
const api = (path, opts) => jfetch(BASE_URL, path, opts);

function check(cond, label) {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) failures += 1;
  return cond;
}

async function freeSeat() {
  const map = await api(`/api/shows/${SHOW_ID}/seats`);
  const free = map.body.seats.find((s) => s.status === 'AVAILABLE');
  if (!free) throw new Error('no AVAILABLE seat left for the smoke drill');
  return free.seat_id;
}

async function holdAndVerify(name, otpHeaders = DET) {
  const seatId = await freeSeat();
  const hold = await api(`/api/shows/${SHOW_ID}/hold`, {
    method: 'POST',
    body: JSON.stringify({
      seat_ids: [seatId],
      customer_name: name,
      customer_phone: '01700000000',
    }),
  });
  if (hold.status !== 201) throw new Error(`hold failed: ${hold.status} ${JSON.stringify(hold.body)}`);
  const ref = hold.body.booking_ref;

  const send = await api(`/api/bookings/${ref}/otp/send`, {
    method: 'POST',
    body: '{}',
    headers: otpHeaders,
  });
  if (send.status !== 200) throw new Error(`otp/send failed: ${send.status} ${JSON.stringify(send.body)}`);
  const verify = await api(`/api/bookings/${ref}/otp/verify`, {
    method: 'POST',
    body: JSON.stringify({ code: OTP_CODE }),
    headers: otpHeaders,
  });
  if (verify.status !== 200) throw new Error(`otp/verify failed: ${verify.status} ${JSON.stringify(verify.body)}`);
  return { ref, seatId };
}

async function pollBooking(ref, want, timeoutMs = 30000) {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < timeoutMs) {
    const b = await api(`/api/bookings/${ref}`);
    last = b.body?.status;
    if (last === want) return { reached: true, ms: Date.now() - t0 };
    if (['CONFIRMED', 'FAILED', 'EXPIRED', 'CANCELLED'].includes(last) && last !== want) {
      return { reached: false, ms: Date.now() - t0, last };
    }
    await sleep(500);
  }
  return { reached: false, ms: timeoutMs, last };
}

async function seatStatus(seatId) {
  const map = await api(`/api/shows/${SHOW_ID}/seats`);
  return map.body.seats.find((s) => s.seat_id === seatId)?.status;
}

console.log(`PAYMENT FOUNDATION SMOKE — ${ts()}`);
console.log(`base_url: ${BASE_URL}, show: ${SHOW_ID}\n`);

// ── 1. Deterministic happy path ─────────────────────────────────────────
console.log('1) deterministic happy path (X-Mock-Mode: deterministic)');
{
  const { ref, seatId } = await holdAndVerify('Happy Path');
  const pay = await api(`/api/bookings/${ref}/pay`, { method: 'POST', body: '{}', headers: DET });
  check(pay.status === 202, `/pay returns 202 immediately (got ${pay.status})`);
  const done = await pollBooking(ref, 'CONFIRMED');
  check(done.reached, `booking CONFIRMED via async callback after ~${done.ms}ms (last=${done.last ?? 'CONFIRMED'})`);
  check((await seatStatus(seatId)) === 'BOOKED', 'seat map shows BOOKED');
}

// ── 2. Forced failure ───────────────────────────────────────────────────
console.log('2) forced failure (X-Mock-Force: fail)');
{
  const { ref, seatId } = await holdAndVerify('Forced Fail');
  // Force headers must NOT be combined with deterministic mode — the
  // gateway's deterministic mode always succeeds and would win.
  const pay = await api(`/api/bookings/${ref}/pay`, {
    method: 'POST',
    body: '{}',
    headers: { 'x-mock-force': 'fail' },
  });
  check(pay.status === 202, `/pay returns 202 (got ${pay.status})`);
  const done = await pollBooking(ref, 'FAILED');
  check(done.reached, `booking FAILED via callback (last=${done.last ?? 'FAILED'})`);
  check((await seatStatus(seatId)) === 'AVAILABLE', 'seats released back to AVAILABLE');
}

// ── 3. Duplicate callback ───────────────────────────────────────────────
console.log('3) duplicate callback (X-Mock-Force: duplicate)');
{
  const { ref, seatId } = await holdAndVerify('Dup Callback');
  const pay = await api(`/api/bookings/${ref}/pay`, {
    method: 'POST',
    body: '{}',
    headers: { 'x-mock-force': 'duplicate' },
  });
  check(pay.status === 202, `/pay returns 202 (got ${pay.status})`);
  const attemptRef = pay.body.attempt_ref;
  const done = await pollBooking(ref, 'CONFIRMED');
  check(done.reached, `booking CONFIRMED exactly once (last=${done.last ?? 'CONFIRMED'})`);
  await sleep(4000); // give the duplicate delivery time to arrive
  const still = await api(`/api/bookings/${ref}`);
  check(still.body.status === 'CONFIRMED', 'booking still CONFIRMED after duplicate');
  check((await seatStatus(seatId)) === 'BOOKED', 'seat BOOKED exactly once');
  const deliveries = await jfetch(GATEWAY_DEBUG, `/debug/deliveries?booking_ref=${attemptRef}`);
  const count = Array.isArray(deliveries.body) ? deliveries.body.length
    : Array.isArray(deliveries.body?.deliveries) ? deliveries.body.deliveries.length : 'n/a';
  console.log(`  info  gateway /debug/deliveries for ${attemptRef}: ${count} deliveries`);
}

// ── 4. Race: callback before /charge responds ───────────────────────────
console.log('4) race (X-Mock-Force: race — callback beats the /charge response)');
{
  const { ref } = await holdAndVerify('Race Mode');
  const pay = await api(`/api/bookings/${ref}/pay`, {
    method: 'POST',
    body: '{}',
    headers: { 'x-mock-force': 'race' },
  });
  check(pay.status === 202, `/pay returns 202 (got ${pay.status})`);
  const done = await pollBooking(ref, 'CONFIRMED');
  check(done.reached, `booking CONFIRMED despite callback-first ordering (last=${done.last ?? 'CONFIRMED'})`);
}

// ── 5. Timeout then retry ───────────────────────────────────────────────
console.log('5) charge timeout then retry (X-Mock-Force: timeout)');
{
  const { ref } = await holdAndVerify('Timeout Retry');
  const t0 = Date.now();
  const pay = await api(`/api/bookings/${ref}/pay`, {
    method: 'POST',
    body: '{}',
    headers: { 'x-mock-force': 'timeout' },
  });
  const elapsed = Date.now() - t0;
  check(pay.status === 503, `/pay returns 503 when the gateway hangs (got ${pay.status})`);
  check(elapsed < 10000, `handler unblocked by client timeout in ${elapsed}ms (never waits 30s)`);
  const retry = await api(`/api/bookings/${ref}/pay`, { method: 'POST', body: '{}', headers: DET });
  check(retry.status === 202, `retry /pay re-drives the attempt (got ${retry.status})`);
  const done = await pollBooking(ref, 'CONFIRMED');
  check(done.reached, `booking CONFIRMED after retry (last=${done.last ?? 'CONFIRMED'})`);
}

console.log(`\n${failures === 0 ? 'RESULT: PASS — all payment smoke checks green' : `RESULT: FAIL — ${failures} check(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
