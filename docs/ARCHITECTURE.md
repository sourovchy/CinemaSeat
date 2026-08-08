# CinemaSeat — Architecture

## Overview

One modular monolith: **Node.js 22+ / Fastify / raw SQL (`pg`) / PostgreSQL 16**.
Three containers: `app`, `db`, `gateway` (the provided
`asifmahmoud414/mock-gateway:latest` — never a self-made mock).

```
                 ┌─────────────────────────────┐
  client ──────▶ │  app (Fastify monolith)     │ ──── /charge, /otp/* ───▶ ┌─────────┐
                 │  catalog | booking | payment │                          │ gateway │
                 │  platform (db, config,      │ ◀─── payment callbacks ── │  :9000  │
                 │  health, sweeper)           │                          └─────────┘
                 └──────────────┬──────────────┘
                                │ transactions (the only lock)
                         ┌──────▼──────┐
                         │ PostgreSQL  │
                         └─────────────┘
```

Internal modules (folders, not services): `catalog` (movies/theatres/shows/seat
map), `booking` (hold, expiry sweeper), `payment` (charge client, callback
processor, OTP proxy), `platform` (db pool, migrations, config, health).

**Why a monolith:** every hard requirement — atomic seat claim, hold expiry,
callback idempotency, the charge/callback race — is a *transaction-boundary*
problem. A monolith lets each critical operation be exactly one PostgreSQL
transaction. Raw SQL keeps those boundaries visible. Stateless app ⇒ N replicas
behind a load balancer remain correct, because every invariant lives in
Postgres row locks and unique constraints.

**Failure boundaries:** the gateway is the only external dependency, isolated
behind 3 s timeouts. Gateway death degrades only pay/OTP endpoints to clean
503s; browse/seat-map/hold/`/health` never touch it.

## Data model

```
movies      (id PK, title, duration_min, rating, description)
theatres    (id PK, name, city)
screens     (id PK, theatre_id FK, name, row_count, cols_per_row)
seats       (id PK, screen_id FK, row_label, seat_number,
             UNIQUE (screen_id, row_label, seat_number))
shows       (id PK, movie_id FK, screen_id FK, starts_at, price_cents,
             UNIQUE (screen_id, starts_at))

show_seats  (show_id FK, seat_id FK,
             status CHECK IN ('AVAILABLE','HELD','BOOKED'),
             booking_id FK NULL,             -- current owner
             hold_expires_at timestamptz,
             PRIMARY KEY (show_id, seat_id)) -- ← THE lock row

bookings    (id PK uuid, ref UNIQUE, show_id FK,
             customer_name, customer_phone,
             status CHECK IN ('HELD','PAYMENT_PENDING','CONFIRMED',
                              'FAILED','EXPIRED','CANCELLED'),
             amount_cents, otp_verified_at, hold_expires_at,
             active_payment_id FK payments NULL,  -- the ONE attempt allowed
             created_at)                          -- to confirm this booking

payments    (id PK uuid, booking_id FK,
             attempt_ref UNIQUE,              -- sent to gateway as booking_ref
             gateway_payment_id UNIQUE NULL,  -- reconciled from /charge reply
             status CHECK IN ('PENDING','SUCCEEDED','FAILED',
                              'REFUNDED','SUPERSEDED'),
             needs_refund bool DEFAULT false, -- late success on a dead attempt
             amount_cents, created_at)
             + partial unique: UNIQUE (booking_id) WHERE status='PENDING'

payment_events (event_id PK,                  -- gateway evt_xxx: dedupe anchor
                payment_id, booking_ref, status, payload jsonb, received_at)
```

All money in integer cents. All timestamps `timestamptz`. **All expiry
comparisons use the database clock (`now()`)** — app clocks are never trusted.

## Concurrency strategy (the core of the system)

### Single invariant

> For a given (show, seat): **maximum one active owner, ever.**

One row per (show, seat) in `show_seats` means "who owns this seat" is a single
row, and PostgreSQL row-level locking serializes every writer of that row.

### Hold transaction (transaction boundary, documented per review)

```
BEGIN;
  INSERT INTO bookings (status='HELD', hold_expires_at = now()+TTL, ...);

  -- Deterministic lock order: ALWAYS ascending seat_id. Overlapping
  -- multi-seat holds therefore queue instead of deadlocking.
  SELECT seat_id FROM show_seats
   WHERE show_id=$1 AND seat_id = ANY($2)
   ORDER BY seat_id
   FOR UPDATE;

  UPDATE show_seats
     SET status='HELD', booking_id=$b,
         hold_expires_at = now() + ($HOLD_TTL_SECONDS * interval '1 second')
   WHERE show_id=$1 AND seat_id = ANY($2)
     AND (status='AVAILABLE'
          OR (status='HELD' AND hold_expires_at <= now()));  -- lazy expiry

  -- rowcount = requested count → COMMIT (all-or-nothing)
  -- rowcount short            → ROLLBACK, HTTP 409 listing the losers
COMMIT / ROLLBACK;
```

Under 100 concurrent requests for one seat: the `FOR UPDATE` on the single row
serializes all contenders; the first transaction's UPDATE flips the status; the
other 99 acquire the lock in turn, match zero rows, and get a clean 409.
Correct across multiple app replicas and restarts — no state lives in the app.

**Locking rules (uniform, per review correction #2):**
- Any transaction touching multiple `show_seats` rows locks them first with
  `SELECT … ORDER BY seat_id FOR UPDATE` (holds, callback confirm/release).
- The sweeper uses `FOR UPDATE SKIP LOCKED` — contended rows are simply picked
  up on the next sweep; the sweeper never fights a live transaction.
- No `SELECT`-then-`UPDATE` without locks, no app-level flags, no in-memory
  locks anywhere.

### Hold expiry — two cooperating layers

1. **Lazy, transactional (correctness):** every claim treats
   `HELD AND hold_expires_at <= now()` as available (clause above); the seat
   map computes effective status the same way. Correct even if the sweeper
   never runs.
2. **Sweeper (hygiene):** every `SWEEP_INTERVAL_SECONDS` one conditional UPDATE
   releases expired `HELD` seats and marks their `HELD` bookings `EXPIRED`.
   Safe with concurrent replicas (same conditional-update property).

Initiating payment extends `hold_expires_at` on the booking's seats to
`now() + PAYMENT_PENDING_TIMEOUT_SECONDS`, so the lazy clause cannot give the
seat away mid-payment. `HOLD_TTL_SECONDS` always comes from the environment.

## State machines

Booking and payment-attempt states are modeled **separately** (review
correction #3):

```
Booking:  HELD ──pay──▶ PAYMENT_PENDING ──active cb SUCCEEDED──▶ CONFIRMED
            │                 ├──active cb FAILED──▶ FAILED   (seats released)
            │                 └──safety timeout────▶ FAILED   (seats released,
            │                                        attempt SUPERSEDED)
            └──TTL──▶ EXPIRED (seats released)

Payment attempt:  PENDING ──▶ SUCCEEDED ──▶ REFUNDED
                     │   └──▶ FAILED
                     └──▶ SUPERSEDED ──(late success + refund)──▶ REFUNDED

Seat:  AVAILABLE ⇄ HELD ──▶ BOOKED
```

### Active-attempt invariant (review corrections #1 and #3)

> **Only the payment attempt whose id equals `bookings.active_payment_id` may
> transition a booking to CONFIRMED.**

- Each attempt gets its own unique `attempt_ref` (e.g. `bk_7f3a2c-2`), sent to
  the gateway as `booking_ref`, so callbacks can never cross wires between
  attempts.
- **Retry** (after a synchronous `/charge` 500/timeout), one transaction:
  old attempt `PENDING → SUPERSEDED` → insert new `PENDING` attempt with a new
  `attempt_ref` → repoint `bookings.active_payment_id`. The partial unique
  index guarantees at most one `PENDING` attempt per booking at all times.
- **Late `SUCCEEDED` callback for a superseded attempt:** return HTTP 200,
  do **not** confirm the booking, set `needs_refund = true`, call gateway
  `/refund`; the eventual `REFUNDED` callback moves the attempt
  `SUPERSEDED → REFUNDED`. A refund that cannot be sent (gateway down) is
  retried by the sweeper while `needs_refund` is true.
- **Late `FAILED` callback for a superseded attempt:** record the event,
  no state change, HTTP 200 (nothing was charged; nothing to refund).

## Payment flow (defeats `X-Mock-Force: race`)

The payment attempt exists in our database **before** the gateway hears about
it, so a callback arriving before `/charge` returns can always find it by
`booking_ref = attempt_ref`.

```
POST /api/bookings/:ref/pay
 1. TX: booking is HELD + OTP-verified + unexpired
        → booking PAYMENT_PENDING, seats' hold_expires_at extended,
          INSERT payments (PENDING, fresh attempt_ref),
          bookings.active_payment_id = new attempt.  COMMIT.
 2. Call gateway POST /charge (3 s timeout, X-Mock-* headers forwarded,
        booking_ref = attempt_ref, callback_url = PUBLIC_CALLBACK_URL).
 3. 202 → UPDATE payments SET gateway_payment_id=$id
          WHERE attempt_ref=$ref AND gateway_payment_id IS NULL   -- reconcile
 4. 500/timeout → HTTP 503 "retry payment"; attempt stays PENDING and is
        superseded if/when the client retries.
 5. Return 202 immediately. The frontend polls GET /api/bookings/:ref —
        never the gateway, never a blocked HTTP request.
```

## Callback processing (idempotent, always HTTP 200)

```
POST /api/payments/callback
 1. INSERT INTO payment_events ON CONFLICT (event_id) DO NOTHING.
    Zero rows → duplicate → 200, stop.
 2. Find payment by booking_ref (= attempt_ref). Works even if /charge has
    not returned. Store payment_id if missing. Unknown ref → log, 200.
 3. Guarded transition in ONE transaction:
      UPDATE payments SET status=$new WHERE id=$id AND status='PENDING'
    Zero rows and not the late-success-refund case → already terminal → 200.
 4. Same TX, only when this attempt IS bookings.active_payment_id:
      SUCCEEDED → booking CONFIRMED, seats HELD→BOOKED (locked in seat order)
      FAILED    → booking FAILED,    seats HELD→AVAILABLE
    REFUNDED  → payment → REFUNDED (from SUCCEEDED, or SUPERSEDED+needs_refund)
 5. HTTP 200 — including duplicates, unknown refs, malformed payloads.
```

Three independent layers make duplicates harmless: the `event_id` primary key,
the `status='PENDING'` guard, and the seat-transition guard.

## Health

- `GET /health` — static 200, no I/O, no gateway, no DB. Answers < 1 s even
  with every other container stopped.
- `GET /ready` — DB ping with tight timeout, for orchestration only.

## OTP

`/otp/send` and `/otp/verify` are thin proxies to the provided gateway
(`ref` = booking ref). Successful verify stamps `otp_verified_at`, which
`/pay` requires. Resend is allowed (≈10 % of OTPs are lost by design).
Gateway down/slow → 503 on these two endpoints only; browsing, seat maps,
holds and health are unaffected.
