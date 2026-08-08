# Deployment runbook — Poridhi VM

Target: a single Poridhi VM running Docker with Compose v2. The whole stack
(frontend, backend, PostgreSQL, provided gateway) runs from the root
`docker-compose.yml` — no other infrastructure is required.

## Prerequisites on the VM

- Docker Engine + Compose v2 (`docker compose version` works).
- Outbound internet access to pull `node:22-alpine`, `nginx:1.27-alpine`,
  `postgres:16-alpine`, `asifmahmoud414/mock-gateway:latest`.
- `git clone https://github.com/sourovchy/SeatLock.git`

## Ports

| Port | Service | Exposure |
| --- | --- | --- |
| `${WEB_PORT:-8080}` | `web` — nginx: UI + `/api` + `/health` + `/ready` | **public** — this is the deployed URL |
| `${APP_PORT:-3000}` | `app` — backend API directly | optional public (judges can hit the API directly) |
| `9000` | provided gateway | keep private unless a drill needs it from outside |
| `${POSTGRES_HOST_PORT:-5433}` | PostgreSQL | **never expose publicly** |

Only the `web` port must be reachable through the Poridhi load balancer /
public URL. Everything else communicates over the internal compose network
(`web → app:3000`, `app → gateway:9000`, `app → db:5432`,
`gateway → app:3000` for signed callbacks).

## Environment / secrets

Create `.env` from `.env.example` on the VM. Values that MUST be set for a
real deployment (everything else has working defaults):

```bash
POSTGRES_PASSWORD=<strong random value>        # secret — never commit
GATEWAY_SECRET=z2p-2026-secret                 # must match the provided gateway's HMAC secret
GATEWAY_SIGNATURE_MODE=enforce
WEB_PORT=8080                                  # or whatever the LB forwards to
```

Notes:
- `DATABASE_URL` is composed inside `docker-compose.yml` from the
  `POSTGRES_*` variables — override `POSTGRES_PASSWORD` and it follows.
- `PUBLIC_CALLBACK_URL` stays `http://app:3000/api/payments/callback`: the
  gateway runs **inside the same compose network**, so service DNS is
  correct even in deployment. Only if the gateway were ever moved off-VM
  would this need to become the public URL.
- Secrets live only in `.env` on the VM (git-ignored), passed to containers
  as environment variables. Nothing is baked into images.

## Deploy

```bash
cd SeatLock
cp .env.example .env      # then edit POSTGRES_PASSWORD etc.
docker compose up -d --build
docker compose ps         # wait until web/app/db report healthy
```

## Verify after deploy

```bash
curl -fsS http://<public-url>/health          # {"status":"ok"} via nginx → app
curl -fsS http://<public-url>/ready           # {"status":"ready"} (DB ping)
curl -fsS http://<public-url>/api/movies      # catalog through the proxy
curl -fsS http://<public-url>/theatres        # returns index.html (SPA fallback)
```

Then in a browser: load the UI, open a seat map, hold a seat, complete a
deterministic payment (`X-Mock-Mode: deterministic`, OTP `123456` — the
smoke drill `node scripts/payment-smoke.mjs` automates this from the VM).

## Persistence

PostgreSQL data lives in the named volume `dbdata`. It survives
`docker compose down` and VM reboots (`restart: unless-stopped` brings every
service back). **Never run `docker compose down -v` in production** — `-v`
deletes the volume and all bookings.

## Health monitoring

- `web` healthcheck: nginx serves `/` (static, no dependencies).
- `app` healthcheck: `GET /health` — static 200, stays green even with the
  gateway stopped (verified drill).
- `db` healthcheck: `pg_isready`.
- Readiness (`GET /ready`) does a live DB ping — use it for load-balancer
  target checks if Poridhi supports them.

## Things that could fail on a clean VM — checked

| Risk | Status |
| --- | --- |
| Port 8080/3000 already taken on the VM | override `WEB_PORT` / `APP_PORT` in `.env` |
| Slow first boot (image pulls + migrations) | app healthcheck has a 20 s start period; compose gates app on db health |
| Gateway image unavailable | app still starts and serves browse/hold (verified gateway-down drill) |
| Browser refresh on a client route | nginx `try_files` SPA fallback (verified in CI) |
| CORS errors | impossible by construction — the UI and `/api` share one origin |
| Wrong architecture (arm64 VM) | all images used are multi-arch on Docker Hub; the two local builds compile on the VM itself |
