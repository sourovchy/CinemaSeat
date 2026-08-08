# Architectural Decisions

Three decisions that shaped this system, with what we gave up for each.

## 1. PostgreSQL row locks are the only concurrency mechanism

**Problem.** The core requirement: 100 concurrent requests for the same seat
must produce exactly one hold, zero oversell — and stay correct with multiple
app instances.

**Options considered.**

1. Redis distributed locks (SETNX + TTL) in front of the database.
2. In-process mutex / queue per seat in Node.
3. PostgreSQL `SERIALIZABLE` isolation and retry loops on 40001 errors.
4. One row per (show, seat) in `show_seats`, claimed with
   `SELECT … ORDER BY seat_id FOR UPDATE` + a conditional `UPDATE`, plus lazy
   expiry (`hold_expires_at <= now()` treated as available) inside the same
   transaction.

**Chosen: option 4.**

**Why.** The seat's owner is a single database row, so PostgreSQL's row lock
*is* the mutual exclusion — there is no second system whose state can drift
from the source of truth. A Redis lock adds a component whose TTL/failover
semantics can disagree with Postgres (that disagreement is exactly how
double-bookings are born); an in-process mutex is wrong the moment a second
replica exists; SERIALIZABLE punts the conflict to error-handling code paths
that only fire under load — the hardest place to be wrong. Locking in
ascending `seat_id` order makes overlapping multi-seat holds queue instead of
deadlocking, and using the database clock for expiry means app clock skew is
irrelevant. Verified: 100-burst → 1/99/0 (twice locally + in CI), overlapping
multi-seat races, reclaim-without-sweeper.

**Sacrificed.** Peak hold throughput per seat is bounded by serial row-lock
processing (irrelevant: contention on one seat is precisely the case that
must serialize), and PostgreSQL is a scaling bottleneck we accept for a
weekend system. We also run a small sweeper for hygiene — pure lazy expiry
would have been less code but would leave stale rows and misleading metrics.

## 2. Modular monolith, raw SQL, three containers

**Problem.** Eight hours to ship browse → hold → pay → confirm with tests,
CI, Docker and a deployment. Every hard requirement (atomic claim, expiry,
callback idempotency, the charge/callback race) is a *transaction boundary*
problem.

**Options considered.**

1. Microservices (catalog / booking / payment services + a queue).
2. Monolith with an ORM (Prisma/Sequelize).
3. Modular monolith: Fastify + raw `pg` SQL, folders as module boundaries
   (`catalog`, `booking`, `payment`, `platform`), one PostgreSQL, the
   provided gateway as the only external dependency.

**Chosen: option 3.**

**Why.** Correctness here lives in transaction boundaries; a monolith lets
each critical operation be exactly one PostgreSQL transaction, and raw SQL
keeps those boundaries visible in the code (the hold is one readable
function). Splitting booking and payment into services would turn the
charge/callback race into a distributed-systems problem needing sagas or
outboxes — enormous cost, zero judged benefit. The app is stateless, so
horizontal scaling is still just N replicas behind a load balancer.

**Sacrificed.** No independent scaling/deployment of modules; no ORM
conveniences (we hand-write mapping and migrations); module discipline is by
convention, not process boundary.

## 3. Payment attempts exist before the gateway hears about them

**Problem.** The gateway is deliberately hostile: callbacks arrive 2–15 s
late, may duplicate, may *arrive before `/charge` returns* (`X-Mock-Force:
race`), `/charge` can 500 or hang, and non-2xx callback responses are
retried up to 8 times.

**Options considered.**

1. Call `/charge` first, create the payment record from its response, match
   callbacks by the gateway's `payment_id`.
2. Persist a payment-attempt row (unique `attempt_ref`, sent to the gateway
   as `booking_ref`) and flip the booking to `PAYMENT_PENDING` in one
   transaction **before** calling `/charge`; resolve callbacks by
   `booking_ref`; process each callback in ONE transaction whose first step
   is `INSERT INTO payment_events (event_id PRIMARY KEY) … ON CONFLICT DO
   NOTHING`; send `Idempotency-Key: <attempt_ref>` on every charge and
   re-drive the *same* attempt after a 500/timeout.

**Chosen: option 2.**

**Why.** Option 1 is structurally broken against this gateway: in race mode
the callback can arrive while `/charge` is still in flight, and there is no
record to match — the exact failure the problem statement warns about. With
attempt-first there is always a committed row to find. Three independent
layers make duplicates harmless (event-id primary key, `status='PENDING'`
guard, seat-transition guards), and because the event insert shares the
transaction with the state change, a mid-processing crash rolls both back and
the gateway's retry reprocesses cleanly — dedupe can never eat an unprocessed
event. The idempotency key makes `/pay` retries charge-once by construction.
Verified against the real gateway image: race, duplicate (2 deliveries → 1
event row → 1 confirmation), fail, timeout+retry — all with raw-body HMAC
verification enforced.

**Sacrificed.** A little bookkeeping complexity (per-attempt refs,
`active_payment_id`, `needs_refund` flag) and rare orphan `PENDING` attempts
if a client never retries — cleaned up by the safety-timeout path rather than
instantly. Automated `/refund` driving is deferred; late success on a dead
attempt is currently flagged and logged, not auto-refunded.
