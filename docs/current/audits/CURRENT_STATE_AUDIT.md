# CinemaSeat Current-State Audit (Post-Hackathon)

This audit documents the technical architecture, implemented runtime invariants, database design, configuration structure, and current verification boundaries of the CinemaSeat application.

---

## 1. Scope
This document records the current, active system state of CinemaSeat following the post-hackathon branding transition and refinement phase. It outlines current architecture, database schema rules, and known verification limits.

---

## 2. Current Project Identity
* **Project Name**: CinemaSeat
* **Active Repository**: `https://github.com/sourovchy/CinemaSeat`
* **Local Workspace**: `E:\VS Code\CinemaSeat`

---

## 3. Current Architecture
The CinemaSeat system is structured as a decoupled web application with the following components:

### Frontend (Client)
* **Framework**: React 18.3, Single Page Application (SPA).
* **Build System**: Vite 5, TypeScript 5.
* **Styling**: Vanilla CSS (`styles.css`) for high-performance and clean UI customization.
* **External Integration**: Presentation-only TMDB (The Movie Database) API client integration (`VITE_TMDB_API_KEY`) utilized to enrich movie cards with posters, backdrops, and ratings. Falls back gracefully to base64 placeholder assets if the API key is not configured.

### Backend (Server)
* **Runtime**: Node.js (v22+), Fastify 5 framework.
* **Database Driver**: `node-postgres` (`pg`) for transactional queries and pooling.
* **Monolithic API**: Exposes JSON REST endpoints under `/api/*` for catalogs, seat queries, OTP dispatch/verification, payment triggers, and webhook ingestion.

### Database
* **Database Engine**: PostgreSQL 16.
* **Persistence & Synchronization**: Runs in a named volume (`dbdata`) to survive container restarts. Uses advisory locks (`727001` and `727002`) to serialize startup migrations and schedulers across concurrent application instances.

### Payment & OTP Integration
* **Gateway Service**: outbound connection to mock payment gateway (`asifmahmoud414/mock-gateway`).
* **Protocol**: Asynchronous HTTP `/charge` and `/otp` calls. Transition outcomes are returned asynchronously to the backend webhook callback `/api/payments/callback` signed with an HMAC-SHA256 signature to prevent request forgery.

---

## 4. Core Runtime/Business Invariants
The codebase implements and enforces the following business logic rules:
* **Genuine Show IDs**: The frontend consumes and processes genuine backend-driven show IDs directly. Virtual mapping or modulo-encoded client show IDs are not utilized.
* **Database Seat Inventory**: Seat states are stored and queried at the individual `(show_id, seat_id)` level in the `show_seats` table, ensuring isolated inventory per screening.
* **Concurrency Protection**: Multi-seat bookings are processed atomically. A database-level write lock (`SELECT ... FOR UPDATE` ordered lexicographically by `seat_id`) prevents concurrent users from double-booking or causing deadlocks.
* **Show Schedule Generation**: An automated scheduler in `src/catalog/generator.js` calculates and populates shows for Yesterday, Today, and the next 6 days. It dynamically maps days to a rotating 3-day template schedule (August 8, 9, 10, 2026) using Bangladesh Standard Time (BST, UTC+6) calculations.
* **Idempotent Webhooks**: Incoming gateway callback webhook payloads are verified by transaction signatures, and duplicate events are ignored via a unique key constraint on the `payment_events.event_id` column.

---

## 5. Database Structure
The schema database structures are managed via SQL migrations located in `database/migrations/`:
* **`001_init.sql`**: Scaffolded the core relations (`movies`, `theatres`, `screens`, `seats`, `shows`, `bookings`, `payments`, `show_seats`, `payment_events`) and set checking constraints.
* **`002_restore_theatres.sql`**: Added the `address` column to `theatres`, restored the 3 target theatres (Mirpur, Dhanmondi, Chattogram) along with halls 1-3 for each, and idempotently generated layout seats.
* **`seed.sql`**: Houses baseline catalog entries.

---

## 6. Security / Configuration
* **Environment variables**: System secrets (such as `DATABASE_URL` and `GATEWAY_SECRET`) are read strictly from `.env` files.
* **HMAC Signature Check**: Webhook validation is enforced when `GATEWAY_SIGNATURE_MODE=enforce` is configured, checking header signatures against the configured gateway secret.

---

## 7. Current Known Limitations
* **Port Conflict Isolation**: On Windows hosts with Hyper-V dynamic port exclusions, PostgreSQL host port mapping may require an open port (e.g. 5500) via `POSTGRES_HOST_PORT` to avoid socket reservation conflicts. Docker Compose service networking internally remains on standard `db:5432`.
* **Environment-Specific Timezones**: Scheduling logic uses strict BST (UTC+6) representation to map calendar days, which has been verified through independent timezone-mocking unit tests.

---

## 8. Documentation Boundaries
* **Living Documentation**: Describes the active state of CinemaSeat:
  * `README.md`
  * `DECISIONS.md`
  * `docs/ARCHITECTURE.md`
  * `docs/DEPLOYMENT.md`
  * `docs/REQUIREMENTS.md`
* **Frozen Snaphots (Historical)**: Unchanged submission records from the hackathon era:
  * Snapshot files: `docs/README_SUBMITTED.md`, `docs/ARCHITECTURE_SUBMITTED.md`, `docs/DECISIONS_SUBMITTED.md`
  * Snapshot directories: `docs/audits/`, `docs/test-evidence/`, and `docs/reference/`
