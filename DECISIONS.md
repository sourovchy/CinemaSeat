# CinemaSeat — Architectural Decisions

This document records the significant architectural and engineering decisions that shape the CinemaSeat application.

**Hackathon submission:** The original decision record is preserved in [`docs/DECISIONS_SUBMITTED.md`](docs/DECISIONS_SUBMITTED.md).

---

## 1. PostgreSQL Row Locks as the Concurrency Mechanism

### Context
Seat holds must be mutually exclusive. Under concurrent request bursts (such as 100 requests competing for a single seat), only one transaction may succeed, preventing double-booking across multiple application instances.

### Options Considered
1. **Redis Distributed Locks**: Implementing distributed locks (`SETNX` with a TTL) in front of the database.
2. **In-Process Locks/Mutexes**: Managing an in-memory queue or mutex per seat within the Node.js runtime.
3. **PostgreSQL Serializable Isolation**: Using `SERIALIZABLE` transactions and executing client-side retry loops when serializability conflicts occur.
4. **PostgreSQL Row-Level Locking**: Representing each seat as a row in the `show_seats` table and using `SELECT ... FOR UPDATE` combined with a conditional `UPDATE` within a single database transaction.

### Decision
We chose PostgreSQL row-level locks on the `show_seats` table (Option 4). The data state and the lock are combined in the same database row.

### Rationale
Relying on database row-level locks couples the lock directly to the data. There is no separate service (such as Redis) whose TTL or failover state can drift from the database's actual state. In-process mutexes do not work across multiple application replicas. PostgreSQL serializable transactions handle conflicts by throwing serialization errors, which shifts the complexity to retry handlers that are hard to verify under load. The booking transaction acquires locks on `show_seats` in ascending order of `seat_id` to prevent deadlocks.

### Trade-offs
* **Throughput limits**: Throughput per seat is capped by database serial processing time. This lock contention is accepted because multiple bookings for the same seat must serialize anyway.
* **Database load**: Row-level locking transfers transaction coordination to the database engine, making PostgreSQL the primary scaling bottleneck.

---

## 2. Modular Monolith with Raw SQL and Four Containerized Services

### Context
The project required implementing the entire workflow (`browse → show → seat → hold → pay → confirm`) within a tight timeline. The primary challenge was ensuring transactional integrity across seat holds, payment attempts, and webhook callback processing.

### Options Considered
1. **Microservices**: Standalone services communicating asynchronously via message queues.
2. **Monolith with an ORM**: A monolithic codebase built using an abstraction layer like Prisma or Sequelize.
3. **Modular Monolith**: A single Node.js/Fastify application structured into logical directories (`catalog`, `booking`, `payment`, `platform`) using raw database connections.

### Decision
We chose a modular monolith with raw SQL using Fastify (Option 3). The application is deployed via Docker Compose with four services: `web` (Nginx), `app` (Fastify backend), `db` (PostgreSQL), and `gateway` (mock gateway).

### Rationale
Correctness relies on strict transaction boundaries. A monolith allows critical operations (like holding seats and updating payment state) to run inside single database transactions. This avoids the need for distributed transaction patterns, outboxes, or sagas. Using raw SQL makes locking scopes and transaction boundaries explicit in the code. The Nginx service was added to serve the React SPA, handle SPA routing, and proxy `/api/*` requests same-origin, removing CORS issues and keeping the frontend stateless.

### Trade-offs
* **Coarse scaling**: All modules scale together as a single unit. We cannot scale or deploy the payment module independently of the catalog.
* **No ORM abstractions**: Database mappings and migrations are written manually in raw SQL, requiring more boilerplate.

---

## 3. Payment Attempt Persistence Prior to Gateway Charge Request

### Context
The mock payment gateway operates asynchronously. Webhook callbacks can arrive several seconds late, may duplicate, or may reach the backend webhook handler before the outbound `/charge` request returns (a callback-first race condition).

### Options Considered
1. **Response-driven creation**: Invoke `/charge` first and insert the payment attempt record only after receiving the gateway's `payment_id`.
2. **Attempt-first persistence**: Insert a pending record into `payments` and set the booking's `active_payment_id` before calling the gateway.

### Decision
We chose attempt-first persistence (Option 2). The payment attempt is committed to the database before the gateway is called.

### Rationale
If a callback beats the `/charge` response, option 1 fails because the webhook handler finds no matching record in the database. Attempt-first persistence guarantees that a matching `payments` record is committed before the callback arrives. The webhook handler runs inside a database transaction that verifies idempotency using a primary key constraint on `payment_events.event_id`. Outbound charges include the `attempt_ref` as the `Idempotency-Key`, making retries safe.

### Trade-offs
* **Orphaned attempts**: Abandoned checkouts leave pending payment attempts in the database. The background sweeper cleans these up when the safety window expires.
* **Metadata tracking**: Tracking attempts requires extra columns (`active_payment_id`, `attempt_ref`) and logic in the booking transition steps.

---

## 4. Backend-Driven Rolling Show Generation

### Context
The seed database contains baseline show templates mapped to static dates. To keep the application functional as real-world dates move past the baseline seeds, the system must shift showtimes forward dynamically.

### Options Considered
1. **Manual cron scripts**: Periodically run update scripts or database tasks.
2. **Frontend date shifting**: Offset dates dynamically in the browser UI and encode/decode virtual show IDs.
3. **Backend rolling generation**: Generate actual database records for a sliding calendar window on boot and during catalog queries.

### Decision
We chose backend rolling show generation (Option 3). The backend dynamically inserts shows into the database for a sliding window (Yesterday, Today, and the next 6 days) based on the current date.

### Rationale
Frontend date-shifting relies on virtual IDs, which complicates seat locking because the locked ID does not map directly to a database row. Backend rolling generation keeps show IDs genuine, keeping the API simple and the frontend stateless. To prevent concurrent app replicas from generating duplicate records, the generator acquires a PostgreSQL advisory lock (`727002`) during execution.

### Trade-offs
* **Dynamic writes**: Catalog read operations may trigger write queries if the generator detects that a new date window has opened.
* **Database growth**: The `shows` and `show_seats` tables grow continuously over time, requiring cleanup routines in long-running installations.

---

## 5. Bangladesh Standard Time (BST, UTC+6) Timezone Anchoring

### Context
Docker containers and database hosts default to UTC. If show schedules and rolling date calculations depend on host-local system times, show boundaries can shift across calendar days depending on where the host environment is running.

### Options Considered
1. **System-wide UTC enforcement**: Force the server runtime, Postgres container, and host machine to run strictly in UTC.
2. **Code-level timezone shifting**: Parse dates and calculate schedule offsets using Bangladesh Standard Time (BST, UTC+6) explicitly in the code.

### Decision
We chose explicit timezone shifting (Option 2). Dates are shifted to UTC+6 in the backend logic before processing calendar offsets.

### Rationale
Relying on system-level timezone configuration (Option 1) is fragile because container, VM, or local developer configurations can easily differ. Explicitly anchoring calendar calculations to the UTC+6 offset in code ensures that the sliding window ("Today", "Tomorrow") evaluates identically regardless of host timezone configurations.

### Trade-offs
* **Parsing complexity**: Code must parse date strings with explicit timezone offsets to prevent host timezone defaults from polluting the logic.
