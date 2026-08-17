# CinemaSeat — Deployment & Operations

This document describes the operational layout, environment configuration, database administration, and deployment procedures for the CinemaSeat application.

## Overview

CinemaSeat is designed to run as a containerized stack orchestrated by Docker Compose. In a typical deployment, Nginx serves as the entry point, handling static frontend asset delivery, client-side SPA routing, and reverse-proxying API requests same-origin to the Fastify backend.

## Deployment Architecture

The deployment topology consists of four containerized services interacting over an internal Docker Compose network:

```text
                  [ Web Browser ]
                         │
                         │ HTTP (WEB_PORT, default 8080)
                         ▼
                  ┌──────────────┐
                  │ web (Nginx)  │
                  └──────┬───────┘
                         │
        ┌────────────────┴────────────────┐
        │ Static Assets &                 │ Proxy Pass /api/*
        │ SPA Fallback                    ▼
        │                         ┌──────────────┐
        ▼                         │  app (Node)  │
┌──────────────┐                  └──────┬───────┘
│ React SPA    │                         │
└──────────────┘         ┌───────────────┴───────────────┐
                         │                               │
                         │ SQL Transactions              │ HTTP (9000)
                         ▼                               ▼
                  ┌──────────────┐               ┌──────────────┐
                  │  db (Postgres│               │   gateway    │
                  └──────────────┘               └──────┬───────┘
                                                        │
                                                        │ Webhook (HMAC)
                                                        ▼
                                                 [ POST /callback ]
```

* **web (Nginx)**: Listens on the public host port (default `8080`), serves the compiled React application, and forwards `/api/*` requests to the Fastify backend on port `3000`.
* **app (Fastify Monolith)**: Runs the Node.js application, executing business logic and hosting the background sweeper daemon.
* **db (PostgreSQL 16)**: Persists all data, utilizing a named Docker volume (`dbdata`) to maintain state across restarts.
* **gateway (Mock Payment Gateway)**: Runs the mock gateway image (`asifmahmoud414/mock-gateway:latest`) to simulate payment charges and OTP operations.

The overall system components and data flows are described in the [Architecture Guide](ARCHITECTURE.md).

## Prerequisites

To deploy or run the containerized application stack, you must have the following installed:
* Docker Engine
* Docker Compose (v2)

To run the application services natively outside of containers, you will need:
* Node.js (version 22 or higher)
* PostgreSQL 16 (or compatible local database service)

---

## Environment Configuration

Configuration is managed via environment variables. Create a local `.env` file from the provided template:

```bash
cp .env.example .env
```

### Backend and Private Variables

These variables configure database connections, business logic rules, and payment gateway parameters for the backend monolith.

| Variable | Default Value | Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgres://cinemaseat:cinemaseat@db:5432/cinemaseat` | PostgreSQL database connection string. |
| `GATEWAY_URL` | `http://gateway:9000` | Target URL of the payment/OTP gateway service. |
| `GATEWAY_SECRET` | `z2p-2026-secret` | Shared secret key used to sign and verify HMAC-SHA256 signatures for webhook callbacks. |
| `GATEWAY_SIGNATURE_MODE` | `enforce` | Mode for checking webhook callback signatures (`enforce`, `log`, or `off`). |
| `PUBLIC_CALLBACK_URL` | `http://app:3000/api/payments/callback` | Webhook callback target sent to the gateway. Resolves internally via container DNS. |
| `HOLD_TTL_SECONDS` | `120` | Lifetime (seconds) of a temporary seat hold. |
| `PAYMENT_PENDING_TIMEOUT_SECONDS` | `600` | Maximum lifetime (seconds) of a payment attempt before it is cleaned up. |
| `SWEEP_INTERVAL_SECONDS` | `5` | Wakeup interval (seconds) for the background sweeper daemon. |

### Docker Compose Bindings

These variables control host port mapping for container exposure.

| Variable | Default Value | Purpose |
| :--- | :--- | :--- |
| `WEB_PORT` | `8080` | Host port exposing the Nginx web server. |
| `APP_PORT` | `3000` | Host port exposing the Fastify backend API directly. |
| `POSTGRES_HOST_PORT` | `5433` | Host port exposing PostgreSQL, avoiding conflict with local Postgres instances on `5432`. |

### Frontend Variables

These variables configure Vite at build time and are exposed to the browser.

| Variable | Default Value | Purpose |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `/api` | Base path for API requests (defaulting to relative same-origin calls). |
| `VITE_TMDB_API_KEY` | (Empty) | Optional API key for TMDB movie catalog enrichment. |

---

## Local Development

### Containerized Stack (Recommended)

To run the complete application stack locally inside Docker containers, execute:

```bash
docker compose up --build
```

To test the hold expiration behavior with a short 5-second TTL, pass the parameter when starting:
```bash
HOLD_TTL_SECONDS=5 docker compose up --build
```

Once running, the services are available at:
* **React Frontend**: [http://localhost:8080](http://localhost:8080)
* **Backend API**: [http://localhost:3000](http://localhost:3000)
* **Mock Gateway**: [http://localhost:9000](http://localhost:9000)

### Native Setup (Without Docker)

You can run the application services locally on your host OS. This requires a running PostgreSQL instance.

1. **Configure Environment**:
   Copy `.env.example` to `.env` in the root directory and update it with your local database connection details:
   ```bash
   DATABASE_URL="postgres://username:password@localhost:5432/cinemaseat"
   PUBLIC_CALLBACK_URL="http://localhost:3000/api/payments/callback"
   ```

2. **Boot the Backend**:
   Install dependencies, run database migrations, and start the Fastify server:
   ```bash
   npm install
   npm run migrate
   npm start
   ```

3. **Boot the Frontend**:
   In a separate terminal, navigate to the frontend directory, install dependencies, and launch the Vite development server:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   The Vite development server runs at `http://localhost:5173`. It automatically proxies `/api/*` requests to the local backend at `http://localhost:3000` using the proxy configuration in `frontend/vite.config.ts`.

---

## Database Setup & Migrations

* **Engine**: The database container runs `postgres:16-alpine`.
* **Volume Persistence**: Data is persisted in the named volume `dbdata` mounted at `/var/lib/postgresql/data`. Stopping the stack via `docker compose down` will preserve all data. Do not run `docker compose down -v` unless you explicitly intend to wipe the database.
* **Initialization & Migration**:
  During boot, the Fastify backend runs `migrateAndSeed()` from [`src/platform/migrate.js`](../src/platform/migrate.js). It acquires an advisory lock (`727001`) to synchronize replicas, creates the `schema_migrations` table, and applies unapplied SQL migrations found in [`database/migrations/`](../database/migrations/).
* **Seeding**:
  After migrations are applied, [`database/seed.sql`](../database/seed.sql) is executed idempotently (`ON CONFLICT DO UPDATE`) to seed movies, theatres, screens, and seat layouts. Finally, the showtime scheduler in [`src/catalog/generator.js`](../src/catalog/generator.js) is invoked to generate show templates.

---

## Production VM Deployment

To deploy the application to a target Docker VM (such as a Poridhi VM):

1. **Clone the repository**:
   ```bash
   git clone https://github.com/sourovchy/CinemaSeat.git
   cd CinemaSeat
   ```

2. **Create Production Configuration**:
   Create a local `.env` file and generate a secure password for PostgreSQL:
   ```bash
   POSTGRES_USER=cinemaseat
   POSTGRES_PASSWORD=secure_random_production_password_here
   GATEWAY_SECRET=secure_gateway_secret_here
   GATEWAY_SIGNATURE_MODE=enforce
   ```

3. **Deploy Container Stack**:
   Start the containers in detached mode:
   ```bash
   docker compose up -d --build
   ```
   Docker Compose compiles the React frontend inside a multi-stage build, installs production-only dependencies for the backend monolith, runs all database migrations, and binds the public ports.

4. **Verify Health**:
   Verify that all containers are online and reporting healthy status:
   ```bash
   docker compose ps
   ```

---

## Serving & API Routing

The production web ingress is handled by Nginx. The Nginx server configuration is defined in [`frontend/nginx.conf`](../frontend/nginx.conf) and built into the `web` container.

* **Static Asset Caching**: Vite assets under `/assets/` are served directly with long-lived caching headers (`max-age=31536000, immutable`).
* **Same-Origin API Proxy**: The React application uses relative `/api` paths. Nginx handles proxying `/api/` requests internally to `http://app:3000`, bypassing cross-origin (CORS) concerns.
* **SPA Routing Fallback**: Non-static requests (e.g., paths like `/theatres` or `/bookings/bk_ref/pay`) are caught by the `try_files $uri /index.html` fallback rule, transferring routing control to the React client application.

---

## Monitoring & Probes

The backend monolith exposes two endpoint probes for orchestration and health monitoring:

* **Liveness (`GET /health`)**: Returns `{"status":"ok"}`. This is a fast, static check of the Node runtime. It returns `200` even if PostgreSQL or external dependencies are offline, preventing container restart loops during network drops.
* **Readiness (`GET /ready`)**: Returns `{"status":"ready"}`. This probe checks the database connection pool by running a ping query (`SELECT 1`). Use this check for load-balancer target registration.

Nginx proxies `/health` and `/ready` to the Fastify backend internally, making these health checks accessible directly through the web ingress.

---

## Payment & OTP Gateway

The application connects to a mock OTP and payment gateway using the provided container image `asifmahmoud414/mock-gateway:latest`. 

* **Outbound Calls**: Backend requests `/charge` or `/otp/*` are sent directly to the gateway container at `http://gateway:9000`.
* **HMAC Signatures**: The gateway signs callback webhooks with an HMAC-SHA256 signature in the `X-Signature` header. The backend validates this signature using `GATEWAY_SECRET` to prevent callback forgery.
* **Callback Webhook**: When a charge request completes, the gateway calls `POST /api/payments/callback` on the backend. This callback handler runs inside a database transaction, updating payment attempt status, transitioning the booking status, and marking held seats as `BOOKED` or releasing them.

---

## Verification & Smoke Testing

After running the deployment commands, verify the status of the endpoints:

```bash
# Check web server entrypoint
curl -fsS http://localhost:8080/

# Verify backend status
curl -fsS http://localhost:8080/health

# Verify database connection
curl -fsS http://localhost:8080/ready
```

To run the automated e2e verification suite against the active Docker Compose stack:
```bash
BASE_URL=http://localhost:3000 node scripts/payment-smoke.mjs
```

---

## Historical Hackathon Verification (August 8, 2026)

This section documents the verification runs executed during the original hackathon checkpoint.

### Scenario A: Concurrency Protection (Oversell Prevention)
* **Goal**: Verifies that when 100 concurrent requests compete for the same seat, exactly one reservation succeeds and the other 99 are rejected with `409` (no double-bookings).
* **Logs**: Detailed execution outputs are preserved in [Scenario A Evidence](test-evidence/scenario-a-2026-08-08.md).

### Scenario B: Hold Cleanup (Expiration Sweep)
* **Goal**: Confirms that seats locked under an abandoned hold are released back to `AVAILABLE` status after the expiration timeout passes.
* **Logs**: Detailed execution outputs are preserved in [Scenario B Evidence](test-evidence/scenario-b-2026-08-08.md).
