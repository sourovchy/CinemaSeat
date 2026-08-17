# CinemaSeat (SeatLock)

A movie ticket booking system that **never double-books a seat** — built for
the "Zero to Production — Phase 2: The Ultimate Hackathon" (CUET,
Saturday, 8 August 2026).

**Proven on Saturday, 8 August 2026 against the real composed stack:** 100 concurrent
holds for the same exact seat → **1 success, 99 clean rejections, 0
oversell**; abandoned holds expire and are reclaimed; async payments confirm
through the provided gateway under duplicate/race/failure/timeout modes with
HMAC verification enforced. Verbatim outputs in [docs/test-evidence/](test-evidence/).

## Demo Video

[Watch the full SeatLock demo on Vimeo](https://vimeo.com/1216635590)

## What was built

- Browse **movies / theatres / showtimes**, live **seat map** (AVAILABLE /
  HELD / BOOKED, expired holds show as AVAILABLE immediately).
- **Atomic seat holds** (single or up to 10 seats, all-or-nothing) with a TTL
  driven entirely by the `HOLD_TTL_SECONDS` environment variable.
- Automatic release of abandoned holds: **lazy expiry** on the database clock
  inside every claim/read + a background **sweeper** that materializes it.
- **Async payment** through the PROVIDED gateway
  (`asifmahmoud414/mock-gateway:latest` — no self-made mock): `/pay` returns
  202 immediately; the gateway's callback confirms or fails the booking.
  Payment attempts are persisted **before** `/charge` is called, so the
  official callback-before-charge-response race is handled by design.
  Duplicate callbacks are deduplicated by `event_id` (DB primary key).
  `Idempotency-Key` is sent on every charge so retries can never double-charge.
  Callback signatures (HMAC-SHA256 over the raw body) are **enforced**.
- **OTP** send/verify proxied to the provided gateway; verification gates
  payment.
- **React frontend** (React 18 + TypeScript + Vite): browse movies/theatres/
  shows, live seat map with selection, hold countdown, OTP + payment flow,
  booking status polling. Served in production by nginx (SPA fallback +
  same-origin `/api` proxy) — the bundle contains no backend hostnames.
- **Docker Compose** stack (web + app + PostgreSQL 16 + provided gateway),
  auto-migrate + auto-seed on boot, PostgreSQL named volume for persistence.
- **CI** (GitHub Actions): integration tests against real PostgreSQL + a
  clean-clone compose boot that replays Scenario A, Scenario B and the
  gateway-down health drill on every PR and push to main.

## What works (all verified — see docs/test-evidence/)

| Area | Status |
| --- | --- |
| Health: `GET /health` 200, <10 ms, gateway down or not | ✅ verified |
| Catalog + seat map | ✅ verified |
| Hold (single + multi-seat all-or-nothing) | ✅ verified |
| **Scenario A: 100 concurrent same-seat, 1/99/0** | ✅ verified (twice + in CI) |
| **Scenario B: expiry + reclaim with env-driven short TTL** | ✅ verified (twice + in CI) |
| Async pay → delayed callback → CONFIRMED | ✅ verified |
| `X-Mock-Force: fail / duplicate / race / timeout` | ✅ all verified |
| Duplicate callback: 200 + zero duplicate side effects | ✅ verified |
| HMAC signature verification (enforce mode) | ✅ verified vs real gateway |
| Gateway down ⇒ browse/seat-map/hold/health unaffected | ✅ verified |
| Restart persistence (named volume) | ✅ verified |
| Test suite (16 integration tests, real PostgreSQL) | ✅ 16/16 |

## What does not work yet

- **CD pipeline** not yet added (CI only).
- No automated refund driver: a `SUCCEEDED` callback for a non-confirmable
  attempt is flagged `needs_refund` and logged, but `/refund` is not yet
  called automatically.
- No reconciliation sweeper for bookings stuck in `PAYMENT_PENDING` beyond
  the safety window (seats are protected for `PAYMENT_PENDING_TIMEOUT_SECONDS`,
  default 600 s).
- No Scenario C load-ramp report yet.

## Architecture

```text
            ┌────────────────────────────────┐     ┌────────────────────────────────┐
            │            browser             │     │             client             │
            └───────────────┬────────────────┘     └───────────────┬────────────────┘
                            │                                      │
                            ▼                                      │
            ┌────────────────────────────────┐                     │
            │      web — nginx (:8080)       │                     │
            │  - React SPA bundle + fallback │                     │
            │  - /api/* proxied same-origin  │                     │
            └───────────────┬────────────────┘                     │
                            │                                      │
                            └──────────────────────┬───────────────┘
                                                   │
                                                   ▼
            ┌───────────────────────────────────────────────────────────────────────┐
            │                   app — Node 22 / Fastify monolith                    │
            │  - catalog | booking | payment                                        │
            │  - platform (config, db, migrate, health, sweeper)                    │
            └───────────────┬──────────────────────────────────────┬────────────────┘
                            │                                      │
                            │ SQL transactions —                   │ /charge, /otp/*
                            │ the ONLY locking mechanism           │
                            ▼                                      ▼
            ┌────────────────────────────────┐     ┌────────────────────────────────┐
            │         PostgreSQL 16          │     │   gateway (provided, :9000)    │
            │  - one row per (show, seat)    │     │  - OTP and payment operations  │
            │    = the lock                  │     │  - Sends signed webhooks       │
            └────────────────────────────────┘     └───────────────┬────────────────┘
                                                                   │
                                                                   │ signed callbacks
                                                                   ▼
                                                   ┌────────────────────────────────┐
                                                   │        signed callbacks        │
                                                   └────────────────────────────────┘
```

**Concurrency invariant:** one `show_seats` row per (show, seat). Every hold
locks its target rows with `SELECT … ORDER BY seat_id FOR UPDATE`, re-checks
state under the lock, and claims with a conditional `UPDATE`. 100 concurrent
requests for one seat serialize on that one row lock: the first commit wins,
the other 99 see a live hold and get `409`. No in-memory locks anywhere, so
any number of app replicas stays correct. Expiry uses the **database clock**
(`now()`), never app clocks. Details: [docs/ARCHITECTURE.md](ARCHITECTURE_SUBMITTED.md).

## Clean clone → running stack

Prereqs: Docker with Compose v2. Nothing else.

```bash
git clone https://github.com/sourovchy/SeatLock.git
cd SeatLock
docker compose up --build
```

That single command starts PostgreSQL, the provided gateway, the app and the
production frontend; the app migrates and seeds automatically.
UI: `http://localhost:8080` · API: `http://localhost:3000`.

Judges' short-TTL run (everything else identical):

```bash
HOLD_TTL_SECONDS=5 docker compose up --build
```

No `.env` file is required — copy `.env.example` to `.env` only to override
defaults. Never commit real secrets.

## Exact request: hold a seat

```bash
curl -X POST http://localhost:3000/api/shows/1/hold \
  -H "Content-Type: application/json" \
  -d '{"seat_ids":[1001],"customer_name":"Alice","customer_phone":"01700000000"}'
```

`201`:

```json
{"booking_ref":"bk_4e28cbf3c911","booking_id":"…","show_id":1,"seat_ids":[1001],
 "status":"HELD","amount_cents":45000,"hold_ttl_seconds":120,
 "hold_expires_at":"2026-08-08T05:06:31.000Z"}
```

If the seat is taken — `409`:

```json
{"error":"SEAT_UNAVAILABLE","unavailable_seat_ids":[1001]}
```

## Exact request: fetch a seat map

```bash
curl http://localhost:3000/api/shows/1/seats
```

`200`:

```json
{"show_id":1,
 "seats":[{"seat_id":1001,"row_label":"A","seat_number":1,"status":"AVAILABLE"}, …],
 "summary":{"available":79,"held":1,"booked":0}}
```

## Full API

| Method & path | Purpose |
| --- | --- |
| `GET /health` | judge hook: static 200, no dependencies |
| `GET /ready` | DB-ping readiness (orchestration only) |
| `GET /api/movies` · `/api/theatres` · `/api/shows` | catalog |
| `GET /api/shows/:id/seats` | live seat map |
| `POST /api/shows/:id/hold` | atomic hold (body above) |
| `GET /api/bookings/:ref` | booking + payment status (poll this after /pay) |
| `POST /api/bookings/:ref/otp/send` | send OTP via provided gateway |
| `POST /api/bookings/:ref/otp/verify` | body `{"code":"123456"}` (deterministic mode) |
| `POST /api/bookings/:ref/pay` | async payment — 202 immediately |
| `POST /api/payments/callback` | gateway-only signed webhook |
| `GET /api/config` | effective TTL/sweep knobs (no secrets) |

Booking flow: hold → otp/send → otp/verify → pay → poll `GET /api/bookings/:ref`
until `CONFIRMED` (or `FAILED`). `X-Mock-Mode` / `X-Mock-Force` headers are
forwarded to the gateway for testing (don't combine `deterministic` with a
force header — deterministic always succeeds).

## Environment configuration

All via environment (see [.env.example](../.env.example)):
`HOLD_TTL_SECONDS` (**never hardcoded**), `PAYMENT_PENDING_TIMEOUT_SECONDS`,
`SWEEP_INTERVAL_SECONDS`, `PORT`/`APP_PORT`, `WEB_PORT` (public frontend
port, default 8080), `DATABASE_URL`, `PGPOOL_MAX`,
`GATEWAY_URL`, `GATEWAY_TIMEOUT_MS`, `PUBLIC_CALLBACK_URL` (must be reachable
**from inside the gateway container** → Docker service DNS `http://app:3000/…`,
never localhost), `GATEWAY_SECRET`, `GATEWAY_SIGNATURE_MODE` (off|log|enforce),
`OTP_REQUIRED`.

## Testing

```bash
docker compose up -d db          # tests need the real PostgreSQL (host port 5433)
npm ci
npm test                         # 16 integration tests incl. Scenario A + B
```

Scenario drills against a running stack (what CI runs on every push/PR):

```bash
node scripts/scenario-a.mjs                          # 100-concurrent same-seat burst
HOLD_TTL_SECONDS=5 docker compose up -d && node scripts/scenario-b.mjs
node scripts/payment-smoke.mjs                       # gateway force-header drill
```

Note: the test suite and drills mutate booking data — run them against the
local compose stack, not a production database.

## Scenario A result (Saturday, 8 August 2026, real stack)

```text
REQUESTS SENT: 100 · SUCCESSFUL HOLDS: 1 · REJECTIONS (409): 99 · OVERSELL: 0
SEAT MAP AFTER BURST: seat 1001 = HELD (exactly one owner in the database)
```

Full output + DB proof: [docs/test-evidence/scenario-a-2026-08-08.md](test-evidence/scenario-a-2026-08-08.md)

## Scenario B result (Saturday, 8 August 2026, real stack, `HOLD_TTL_SECONDS=5`)

```text
04:52:39.801Z User A holds seat 1002 (bk_3a5631e7a216), never pays
04:52:39.809Z User B rejected 409 while the hold is live
04:52:47.827Z seat map shows AVAILABLE again (TTL 5s + margin)
04:52:47.836Z booking A reads EXPIRED
04:52:47.847Z User B successfully holds the same seat (bk_66dbc3a37109)
```

Full timeline + sweeper/DB proof: [docs/test-evidence/scenario-b-2026-08-08.md](test-evidence/scenario-b-2026-08-08.md)

## Frontend development

```bash
cd frontend
npm ci
npm run dev          # Vite dev server on :5173, proxies /api to :3000
npm run typecheck && npm test && npm run build
```

In production the frontend is a separate compose service (`web`): a
multi-stage Docker build compiles the bundle and nginx serves it with SPA
fallback, proxying `/api/*` (plus `/health` and `/ready`) to the backend over
the compose network. The application code only ever uses relative `/api/*`
URLs, so no CORS configuration and no per-environment rebuild are needed.

## Deployed URL

**Live on Poridhi:**

https://6a1de2095dde7994028d89e7_4fd4d7ff.lb.poridhi.io

## Repository documentation

- [DECISIONS.md](../DECISIONS.md) — the three architectural decisions and their trade-offs
- [docs/ARCHITECTURE.md](ARCHITECTURE_SUBMITTED.md) — full design: state machines, locking rules, payment races
- [docs/REQUIREMENTS.md](REQUIREMENTS.md) — requirement matrix
- [docs/test-evidence/](test-evidence/) — verbatim proof runs
