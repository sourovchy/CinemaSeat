# Payment drill — official gateway, all force headers, HMAC enforced

**Date:** 2026-08-08 · **Environment:** full compose stack with the PROVIDED
gateway image `asifmahmoud414/mock-gateway:latest`; app running with
`GATEWAY_SIGNATURE_MODE=enforce` (every callback below passed raw-body
HMAC-SHA256 verification — a mismatch would have been rejected with 401).
**Command:** `BASE_URL=http://localhost:3000 node scripts/payment-smoke.mjs`

## Result (verbatim)

```
1) deterministic happy path (X-Mock-Mode: deterministic)
  PASS  /pay returns 202 immediately (got 202)
  PASS  booking CONFIRMED via async callback after ~2081ms (last=CONFIRMED)
  PASS  seat map shows BOOKED
2) forced failure (X-Mock-Force: fail)
  PASS  /pay returns 202 (got 202)
  PASS  booking FAILED via callback (last=FAILED)
  PASS  seats released back to AVAILABLE
3) duplicate callback (X-Mock-Force: duplicate)
  PASS  /pay returns 202 (got 202)
  PASS  booking CONFIRMED exactly once (last=CONFIRMED)
  PASS  booking still CONFIRMED after duplicate
  PASS  seat BOOKED exactly once
  info  gateway /debug/deliveries for bk_7f6e97b1a934-a1: 2 deliveries
4) race (X-Mock-Force: race — callback beats the /charge response)
  PASS  /pay returns 202 (got 202)
  PASS  booking CONFIRMED despite callback-first ordering (last=CONFIRMED)
5) charge timeout then retry (X-Mock-Force: timeout)
  PASS  /pay returns 503 when the gateway hangs (got 503)
  PASS  handler unblocked by client timeout in 3010ms (never waits 30s)
  PASS  retry /pay re-drives the attempt (got 202)
  PASS  booking CONFIRMED after retry (last=CONFIRMED)

RESULT: PASS — all payment smoke checks green
```

Identical PASS on the rebuilt image later the same morning.

## Database cross-check after the drill

Every attempt/booking pair consistent; duplicate deliveries deduped to ONE
`payment_events` row by the `event_id` primary key (the gateway recorded 2
deliveries for the duplicate-mode attempts, both acknowledged HTTP 200):

```
    attempt_ref     |  status   | needs_refund | booking_status
--------------------+-----------+--------------+----------------
 bk_67a1e69768be-a1 | FAILED    | f            | FAILED
 bk_7f6e97b1a934-a1 | SUCCEEDED | f            | CONFIRMED   (duplicate mode)
 …8 more SUCCEEDED/CONFIRMED pairs, zero inconsistencies…
```

## Gateway contract facts verified by probing the real image

- `POST /charge` → `202 {"payment_id":"pay_…","status":"PENDING"}`.
- **Idempotency-Key honored:** same key twice → same `payment_id`, no second
  charge (we send `Idempotency-Key: <attempt_ref>` on every charge; a /pay
  retry after a 500/timeout re-drives the SAME attempt with the SAME key).
- **Callback reached `http://app:3000/api/payments/callback` through Docker
  service DNS** from inside the gateway container (`ok:true, http_status:200`
  in `/debug/deliveries`).
- `X-Signature` = hex HMAC-SHA256(GATEWAY_SECRET, raw body) — matches our
  computation exactly (verified first in log mode, then enforced).
- OTP: `POST /otp/send {"ref"}` → 202; deterministic code `123456`;
  `POST /otp/verify {"ref","code"}` → `200 {"verified":true}`.
- `X-Mock-Mode: deterministic` overrides force headers (always succeeds) —
  force headers must be sent WITHOUT deterministic mode.

## Fault isolation + persistence (same day)

With `docker compose stop gateway`:

```
/health            → 200 in 0.0056s   (HOOK 1: no gateway dependency)
GET /api/movies    → 200
GET /api/shows/3/seats → 200
POST /api/shows/3/hold → 201 (holds keep working)
POST …/otp/send    → 503 {"error":"GATEWAY_UNAVAILABLE"} after the 3s timeout
```

Full-stack restart (`docker compose down` + `up`, volume kept):
9 CONFIRMED bookings and 9 BOOKED seats before === after (PostgreSQL named
volume `dbdata`).
