import { config } from '../platform/config.js';

// Thin HTTP client for the PROVIDED mock gateway (asifmahmoud414/mock-gateway).
// Every call has a hard timeout so a hung gateway (X-Mock-Force: timeout)
// can never hang one of our request handlers.

async function post(path, body, headers = {}) {
  const res = await fetch(config.gatewayUrl + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.gatewayTimeoutMs),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON body; callers treat json === null as opaque
  }
  return { status: res.status, body: json };
}

// Forward ONLY the official test-control headers from an incoming request so
// judges/tests can drive gateway behavior through our API.
export function mockControlHeaders(reqHeaders = {}) {
  const out = {};
  for (const h of ['x-mock-mode', 'x-mock-force']) {
    if (reqHeaders[h]) out[h] = reqHeaders[h];
  }
  return out;
}

// The gateway takes whole currency units (e.g. 450 BDT); we store cents.
export function toGatewayAmount(amountCents) {
  return Math.round(amountCents / 100);
}

export function charge({ amountCents, bookingRef, callbackUrl, idempotencyKey, controlHeaders = {} }) {
  return post(
    '/charge',
    {
      amount: toGatewayAmount(amountCents),
      currency: 'BDT',
      booking_ref: bookingRef,
      callback_url: callbackUrl,
    },
    // Same Idempotency-Key on every re-drive of the same attempt: the gateway
    // returns the same payment_id instead of creating a second charge.
    { 'idempotency-key': idempotencyKey, ...controlHeaders }
  );
}

export function otpSend(ref, controlHeaders = {}) {
  return post('/otp/send', { ref }, controlHeaders);
}

export function otpVerify(ref, code, controlHeaders = {}) {
  return post('/otp/verify', { ref, code }, controlHeaders);
}

export function refund(paymentId) {
  return post('/refund', { payment_id: paymentId });
}
