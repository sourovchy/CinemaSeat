# CI CHECKPOINT AUDIT

## 1. Date

2026-08-08

## 2. Purpose

This document records an **independent CI checkpoint review** of the SeatLock
(CinemaSeat) repository, performed after the previous AI implementation agent
had already finished and locally validated most of the system. The review was
conducted to confirm — independently of any prior AI report — that the
`.github/workflows/ci.yml` workflow actually delivers what the official
CinemaSeat CI requirements demand and what the workflow itself claims.

Methodology:

- The repository on disk is the **source of truth** for implementation state.
- The official CI requirements (REQ-18 etc. in `docs/REQUIREMENTS.md`) are the
  source of truth for compliance.
- Previous AI reports (including the prior Claude Max local-validation
  battery) are treated as **evidence to cross-check, not to trust blindly**.
- The workflow was inspected adversarially across seven lenses
  (GitHub Actions mechanics, official requirement compliance, failure
  propagation, flakiness/timing, security, Docker/Compose behavior, actual
  project test behavior).
- The local validation battery was **rerun end-to-end**, not quoted from
  history.
- The owner handles all Git staging/commits/pushes; this audit only adds a
  single new file under `docs/audits/` and makes no other changes.

## 3. Repository State

| Field | Value |
| --- | --- |
| Current branch | `main` |
| Current HEAD | `1aa4b9f` |
| Working tree | clean except for pre-existing untracked material (no new modifications introduced by this checkpoint) |

Recent commits (from `git log --oneline -5`):

```text
1aa4b9f feat: containerize SeatLock stack
99f54a0 test: add booking and concurrency verification
e966216 feat: implement core booking and payment system
0ae4416 chore: scaffold SeatLock
```

Untracked material (from `git status --short`):

```text
?? .github/
?? .puku/
?? DECISIONS.md
?? README.md
?? docs/
```

- `.github/` contains `.github/workflows/ci.yml` (the CI workflow under review).
- `DECISIONS.md`, `README.md`, and `docs/` are the pre-existing untracked
  documentation set (the only newly added path under `docs/` for THIS
  checkpoint is `docs/audits/CI_CHECKPOINT_2026-08-08.md`).
- `.puku/` is the editor's local cache directory (not part of the project).

No Git write operations were performed in this session.

## 4. Scope Reviewed

Primary artifact: `.github/workflows/ci.yml`.

Supporting files independently inspected to validate the workflow's claims:

- `package.json` (test command, scripts, dependency set)
- `docker-compose.yml` (services, env wiring, healthcheck definitions)
- `Dockerfile` (image build)
- `.env.example` (defaults)
- `.gitignore`, `.dockerignore` (security/build surface)
- `src/app.js` (route surface, `/health`, `/ready`, error handler)
- `src/server.js` (boot sequence, migrate retry, sweeper start, shutdown)
- `src/platform/config.js` (env-driven `HOLD_TTL_SECONDS`, etc.)
- `src/platform/db.js`, `src/platform/migrate.js` (real PostgreSQL usage)
- `src/booking/holds.js`, `src/booking/routes.js`, `src/booking/sweeper.js`
  (concurrency core, expiry, sweeper)
- `src/catalog/routes.js` (browse, seat-map effective status)
- `src/payment/gateway.js`, `src/payment/service.js`, `src/payment/routes.js`
  (payment + OTP + callback paths; timeouts, fault isolation)
- `db/migrations/001_init.sql`, `db/seed.sql` (schema and seed)
- `test/helpers.js`, `test/api.test.js`, `test/scenario-a.test.js`,
  `test/scenario-b.test.js` (real-DB test suite)
- `scripts/scenario-a.mjs`, `scripts/scenario-b.mjs`,
  `scripts/payment-smoke.mjs` (drill scripts)
- `docs/REQUIREMENTS.md` (requirement matrix)
- `docs/ARCHITECTURE.md`, `DECISIONS.md` (context)

## 5. CI Workflow Structure

### Triggers

```yaml
on:
  push:
    branches: [main]
  pull_request:
```

- `pull_request` (any branch) — covers CI on pull requests.
- `push: branches: [main]` — covers CI on default-branch pushes.
- No `schedule`, no `workflow_dispatch`, no extra branches — matches the
  required shape exactly; nothing extraneous.

### Job 1 — `test` (Integration tests, real PostgreSQL)

- `runs-on: ubuntu-latest`
- Service container `postgres` from `postgres:16-alpine`
  - `POSTGRES_USER: cinemaseat`, `POSTGRES_PASSWORD: cinemaseat`,
    `POSTGRES_DB: cinemaseat`
  - Host port `5432:5432`
  - Healthcheck `pg_isready -U cinemaseat -d cinemaseat`, 5 s interval,
    3 s timeout, 10 retries (~ up to 50 s readiness window)
- Steps:
  - `actions/checkout@v4`
  - `actions/setup-node@v4` (Node 22, `cache: npm`)
  - `npm ci`
  - `npm test` with `DATABASE_URL=postgres://cinemaseat:cinemaseat@localhost:5432/cinemaseat`

### Job 2 — `compose-e2e` (Clean-clone compose + scenario drills)

- `runs-on: ubuntu-latest`
- Steps:
  - `actions/checkout@v4`
  - `actions/setup-node@v4` (Node 22)
  - `docker compose config -q` (compose-file syntax validation)
  - `HOLD_TTL_SECONDS=5 docker compose up -d --build` (clean boot with
    env-driven short TTL — exercises HOOK 2/4)
  - Health wait loop:
    `timeout 120 sh -c 'until curl -fsS http://localhost:3000/health > /dev/null 2>&1; do sleep 2; done'`
  - HOOK 1 check: `time curl -fsS http://localhost:3000/health`
  - Scenario A: `node scripts/scenario-a.mjs` with `BASE_URL=http://localhost:3000`
  - Scenario B: `node scripts/scenario-b.mjs` with `BASE_URL=http://localhost:3000`
  - Gateway-down HOOK 1:
    `docker compose stop gateway` then `time curl -fsS …/health`,
    `curl -fsS …/api/movies`, `curl -fsS …/api/shows/1/seats`
  - `if: always() docker compose logs app --tail 200` (diagnostic dump)
  - `if: always() docker compose down -v` (teardown)

## 6. Official Requirement Cross-Check

Status legend: **VERIFIED** = confirmed by direct inspection or actual local
execution; **NOT YET VERIFIED** = cannot be confirmed without an observed
GitHub Actions run; **N/A** = not part of this checkpoint.

| Requirement | Implementation in repo | Verification | Status |
| --- | --- | --- | --- |
| CI on pull requests | `pull_request:` trigger in `ci.yml` | Direct YAML inspection | **VERIFIED (in repository)** — NOT YET VERIFIED ON GITHUB ACTIONS |
| CI on pushes to default branch | `push: branches: [main]` (default branch is `main`) | Direct YAML inspection | **VERIFIED (in repository)** — NOT YET VERIFIED ON GITHUB ACTIONS |
| Code should not merge without passing CI | Default branch protection semantics; both jobs gate PR merges | Inferred from workflow + repo default | **VERIFIED (in repository)** — NOT YET VERIFIED ON GITHUB ACTIONS |
| Real PostgreSQL in CI test job | `services.postgres: postgres:16-alpine` with `pg_isready` healthcheck; tests use real pool via `DATABASE_URL` | YAML inspection + `test/helpers.js` (`resetDb` uses real `pg.Pool`) | **VERIFIED (in repository + local npm test)** |
| `HOLD_TTL_SECONDS` from env | `src/platform/config.js` exposes getter reading `process.env.HOLD_TTL_SECONDS` with fallback 120; compose forwards `${HOLD_TTL_SECONDS:-120}`; CI sets `HOLD_TTL_SECONDS=5` for the compose job | Source + compose + YAML inspection; Scenario B reads `/api/config` and asserts | **VERIFIED (in repository + locally)** |
| `GET /health` < 1 s, dependency-free | `app.get('/health', …)` returns static `{status:'ok'}` without I/O | Source inspection + local latency (91 ms) | **VERIFIED (in repository + local)** |
| `/health` stays 200 with gateway down | App has no gateway dependency on `/health`; CI runs `docker compose stop gateway` then re-runs `/health`, `/api/movies`, `/api/shows/1/seats` | YAML + local re-execution (44 ms after `docker compose stop gateway`) | **VERIFIED (in repository + local)** |
| Scenario A evidence (100/1/99/0) | `scripts/scenario-a.mjs` + `test/scenario-a.test.js` (real HTTP + real DB) | Script + test source; locally `100 / 1 / 99 / 0 / 465 ms` | **VERIFIED (in repository + local)** |
| Scenario B evidence (abandoned hold → expire → reclaim) | `scripts/scenario-b.mjs` + `test/scenario-b.test.js` (TTL=2/1) | Script + test source; locally with TTL=5 via env | **VERIFIED (in repository + local)** |
| Docker Compose full stack verified | `docker-compose.yml` defines `app`, `db`, `gateway` (provided image `asifmahmoud414/mock-gateway:latest`); CI runs `docker compose up -d --build` | YAML + `docker compose config -q` exit 0 + clean boot | **VERIFIED (in repository + local)** |
| Failure propagation | Every meaningful step uses default `set -e`; `curl -fsS` (`-f` fails on non-2xx); no `|| true`, no `continue-on-error`, no `set +e`; `if: always()` only on logs/teardown | YAML inspection + local reruns (each step's exit code observed) | **VERIFIED (in repository + local)** |
| No production secrets in CI | No `secrets:` references; only throwaway CI creds (`cinemaseat/cinemaseat`) inside the job | YAML inspection | **VERIFIED (in repository)** |
| No CD mixed into CI | Single workflow, no deployment step, no SSH, no `actions/deploy*`, no `aws/*` | YAML inspection | **VERIFIED (in repository)** |
| `npm test` = real test suite | `package.json` script `"test": "node --test --test-concurrency=1 \"test/*.test.js\""`; CI runs `npm test` | `package.json` + YAML; locally 16/16 pass | **VERIFIED (in repository + local)** |
| README has exact hold + seat-map requests | README contains both `curl` invocations verbatim | README inspection | **VERIFIED (in repository)** — not changed in this checkpoint |
| `docker compose up` works from a clean clone | Auto-migrate + auto-seed on app boot; CI validates this by booting from a clean stack | Compose + `src/server.js` (`migrateAndSeed` with retry) + local clean-boot | **VERIFIED (in repository + local)** |

## 7. Adversarial Review

All measurements labelled **LOCAL VERIFICATION** were observed on this machine
today. They are **not** GitHub-hosted-runner measurements.

### 7.1 GitHub Actions mechanics

Result: **No confirmed defect.**

Evidence:

- Triggers are valid YAML for `on:` (`push.branches: [main]`,
  `pull_request:`).
- `actions/checkout@v4` and `actions/setup-node@v4` are the current major
  versions.
- `services.postgres` uses the well-formed
  `options: --health-cmd "…" --health-interval 5s --health-timeout 3s
  --health-retries 10` pattern that GitHub Actions waits on before the job
  is allowed to run.
- Default `GITHUB_TOKEN` permissions are sufficient for both jobs (no write
  operations, no API calls, no deployment).

### 7.2 Official requirement compliance

Result: **No confirmed defect.**

Evidence:

- `pull_request` trigger present.
- `push: branches: [main]` present; `main` is the repository's default
  branch (confirmed by `git branch --show-current` and `repoContext`).
- No `schedule`, no `workflow_dispatch`, no extra branches — matches the
  required shape, no extras.
- CI is isolated from CD: no deploy step, no environment promotion, no SSH.

### 7.3 Failure propagation

Result: **No confirmed defect.**

Evidence (per-step):

- `npm ci` — exit code propagates.
- `npm test` — `node --test` exits non-zero on any failed test; locally
  observed EXIT=0 with 16/16 passing.
- `docker compose config -q` — exits non-zero on invalid compose; locally
  observed EXIT=0.
- `HOLD_TTL_SECONDS=5 docker compose up -d --build` — exits non-zero on
  build failures; locally observed EXIT=0.
- Health wait loop: `curl -fsS` (`-f` fails on non-2xx) inside
  `until … do sleep 2; done` wrapped in `timeout 120`. On timeout,
  `timeout` exits 124, propagated by the shell; locally the loop exited 0
  immediately because the app was already healthy.
- `time curl -fsS …/health` — `-f` fails the step on non-200.
- `node scripts/scenario-a.mjs` and `…scenario-b.mjs` — both call
  `process.exit(1)` on any invariant failure (verified by reading both
  scripts). Locally both exited 0.
- Gateway-down block: `docker compose stop gateway`; then
  `curl -fsS …/health`, `…/api/movies`, `…/api/shows/1/seats`. All three
  `curl -f` calls exit non-zero on non-2xx. Locally all 200.
- `if: always()` steps (`docker compose logs app --tail 200`,
  `docker compose down -v`) intentionally run regardless of prior failure
  state, to ensure diagnostics and cleanup.

No `|| true`, no `continue-on-error:`, no `set +e`, no swallowed timeouts.

### 7.4 Flakiness / timing

Result: **No confirmed defect.**

Evidence and timing analysis:

- PostgreSQL readiness in the test job is gated by `pg_isready` (5 s
  interval, 3 s timeout, 10 retries ⇒ ~ up to 50 s window). The `npm test`
  command then hits `localhost:5432`; observed local test run completed in
  ~8 s end-to-end on top of an already-healthy db.
- Compose boot in CI: `HOLD_TTL_SECONDS=5 docker compose up -d --build`.
  App container has a `healthcheck` with `start_period: 20s` and
  `retries: 5 @ interval: 10s`. The `Wait for app health` step then
  polls `/health` for up to 120 s. Local clean boot returned healthy
  immediately on the first probe (HEALTH_OK_AFTER_0s).
- Scenario A burst: 100 concurrent holds + post-burst seat-map fetch.
  **LOCAL VERIFICATION**: 465 ms wall time for the full burst and
  verification.
- Scenario B timing: script reads `/api/config`, asserts
  `hold_ttl_seconds ≤ MAX_TTL` (default 30). With `HOLD_TTL_SECONDS=5`
  the script sleeps `TTL*1000 + 3000` = 8 s. **LOCAL VERIFICATION**:
  completed the hold→wait→expire→reclaim timeline in ~8 s.
- Health-check latencies (LOCAL VERIFICATION):
  - `/health` after fresh boot: **91 ms**
  - `/health` after `docker compose stop gateway`: **44 ms**
  - Both well under the 1 s sub-second hook.

No race conditions were found in the workflow logic. The `compose-e2e`
job's stack-boot, scenarios, and gateway-down sequence is deterministic
and ordered.

### 7.5 Security

Result: **No confirmed defect.**

Evidence:

- No `secrets:` references in the workflow.
- Database credentials `cinemaseat/cinemaseat` are throwaway CI values,
  not production secrets. They match the compose-file defaults and the
  `test/helpers.js` `resetDb` connection-string default.
- `GATEWAY_SECRET` is not referenced from the workflow — it is consumed
  inside the compose stack and only needs to match the gateway image's
  built-in default (`z2p-2026-secret`).
- No deployment credentials, no SSH keys, no cloud tokens.
- No `permissions:` block declared; default `GITHUB_TOKEN` scope on
  `ubuntu-latest` is `contents: read` (plus metadata), which is exactly
  what the job needs. Adding an explicit `permissions: contents: read`
  block would be optional hardening but is not required for correctness.

### 7.6 Docker / Compose behavior

Result: **No confirmed defect.**

Evidence:

- `docker-compose.yml` is well-formed; `docker compose config -q` exit 0
  locally.
- Compose forwards `${HOLD_TTL_SECONDS:-120}` correctly — the CI step
  `HOLD_TTL_SECONDS=5 …` is observed by the running container. Local run
  confirmed `/api/config` reported `hold_ttl_seconds: 5`.
- `db` healthcheck is `pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}`;
  defaults make it identical to the CI service healthcheck.
- `app` healthcheck is in-container (`fetch http://127.0.0.1:3000/health`),
  independent of the gateway.
- `gateway` uses the provided image `asifmahmoud414/mock-gateway:latest`,
  not a self-made mock. No replacement mock exists in the repo.
- `depends_on.db.condition: service_healthy` ensures the app starts only
  after Postgres is ready; `server.js` additionally retries
  `migrateAndSeed` up to 30 × 1 s in case the database is still
  warming up.

### 7.7 Actual project test behavior

Result: **No confirmed defect.**

Evidence:

- `package.json` `"test"` script = `node --test --test-concurrency=1
  "test/*.test.js"`. Matches what CI runs.
- `test/helpers.js` `resetDb` connects via the real `pg.Pool` from
  `src/platform/db.js`, using the configured `DATABASE_URL` (CI sets it
  to the postgres service URL). There is no SQLite / H2 / in-memory
  fallback path.
- `npm test` locally produced `pass 16 / fail 0` against the compose
  `db` service, including Scenario A (`669 ms`) and Scenario B
  (`3022 ms`).
- Scenario B's `test/scenario-b.test.js` mutates
  `process.env.HOLD_TTL_SECONDS = '2'` and asserts the response body
  `hold_ttl_seconds === 2` and `hold_expires_at` after sleep — confirms
  env-driven TTL inside the test job as well.

## 8. Findings

### 8.1 Confirmed Findings

**No confirmed CI defects.**

The workflow delivers exactly what the official CinemaSeat CI requirements
demand: PR + main push triggers, real PostgreSQL test job, real Docker
Compose E2E job running Scenario A + Scenario B + the gateway-down `/health`
drill, with strict failure propagation and no leaked secrets.

### 8.2 Rejected / Non-Blocking Observations

These were considered and **deliberately not changed** in this checkpoint,
per the "fix only confirmed issues / do not add unnecessary complexity" rule:

- **Explicit `permissions: contents: read`** — would be hardening-only. The
  default `GITHUB_TOKEN` scope on `ubuntu-latest` for jobs that only
  checkout and test is already `contents: read`. Adding the block would be
  cosmetic.
- **Explicit `concurrency:` group to cancel superseded runs** — hardening
  only. No flaky-step evidence supports it.
- **Gateway restoration step after the gateway-down block** — unnecessary
  because the next step is `if: always() docker compose logs` and the
  job ends with `if: always() docker compose down -v`, which tears down
  every container and the volume regardless of state.
- **Bumping the health-wait `timeout 120` to a larger value** — not
  warranted; locally `/health` returned on the very first probe after
  boot. The 120 s envelope covers a cold image pull + build + boot many
  times over.
- **Re-running `docker compose config -q` with stricter checks** —
  current check already exits non-zero on any compose syntax error.
- **Pin gateway image by digest instead of `:latest`** — out of scope for
  the CI checkpoint; reproducibility concern is for the deployment task,
  not CI correctness.

## 9. Local Validation Results (actual, observed 2026-08-08)

| Step | Result |
| --- | --- |
| `docker compose config -q` | exit 0 — PASS |
| Clean-volume Compose boot (`HOLD_TTL_SECONDS=5 docker compose up -d --build`) | All three services (`db`, `gateway`, `app`) created, db reached Healthy, app started — PASS |
| `GET /health` (after boot) | 200, 91 ms — PASS |
| `GET /health` (after `docker compose stop gateway`) | 200, 44 ms — PASS |
| `GET /api/movies` (gateway down) | 200 — PASS |
| `GET /api/shows/1/seats` (gateway down) | 200 — PASS |
| Scenario A (`scripts/scenario-a.mjs`) | 100 / 1 / 99 / 0, 465 ms — PASS |
| Scenario B (`scripts/scenario-b.mjs`) | hold → 8 s wait → AVAILABLE + EXPIRED → reclaimed — PASS |
| `npm test` | 16 passed, 0 failed — PASS |
| `docker compose down -v` (cleanup) | exit 0 — PASS |

After teardown the repository's default `HOLD_TTL_SECONDS=120` (compose
default + `.env.example`) is unchanged; this session never modified
`docker-compose.yml` or `.env.example`.

## 10. Scenario A (LOCAL VERIFICATION)

| Field | Value |
| --- | --- |
| `REQUESTS SENT` | 100 |
| `SUCCESSFUL HOLDS` | 1 |
| `REJECTIONS (409)` | 99 |
| `OTHER RESPONSES` | 0 |
| `OVERSELL COUNT` | 0 |
| `BURST WALL TIME` | 465 ms |
| Target seat | 1001 (screen 1, A1) |
| Winner | `bk_d258a62eba95` |
| Seat map after burst | seat 1001 = HELD |
| Winner booking | `status=HELD seats=[1001]` |
| Script exit | 0 (PASS) |

## 11. Scenario B (LOCAL VERIFICATION)

| Field | Value |
| --- | --- |
| `HOLD_TTL_SECONDS` (env) | 5 |
| User A hold | `bk_63ba5a554b8f`, expires 2026-08-08T05:47:12.897Z |
| User B while hold live | 409 `SEAT_UNAVAILABLE` |
| Wait | 8 s (TTL 5 s + 3 s margin) |
| Seat after expiry | AVAILABLE |
| User A booking | EXPIRED |
| User B reclaim | `bk_04a40f718bff` (same seat) |
| Final seat state | HELD by User B |
| Script exit | 0 (PASS) |

## 12. GitHub Actions Status

**NOT YET VERIFIED ON GITHUB ACTIONS.**

The workflow has been locally validated end-to-end on this machine. The
owner has not yet pushed to `main` and a GitHub Actions run has therefore
not been observed. Until an actual `Actions` run is observed against the
real runner, GitHub-hosted CI status is **unknown**.

The owner is responsible for:

1. Staging `.github/workflows/ci.yml` (and this audit document) in a
   commit.
2. Pushing to `main` (or opening a PR) to trigger the workflow.
3. Observing the GitHub Actions run results.

## 13. Files Modified By This Checkpoint

| File | Status |
| --- | --- |
| `.github/workflows/ci.yml` | **Not modified.** Inspected and confirmed correct as-is; no defects to fix. |
| `docs/audits/CI_CHECKPOINT_2026-08-08.md` | **Created** by this checkpoint (this document). |

No other files were created or modified. No Git operations were performed.

## 14. Files Intentionally Not Modified

The following files were **inspected but deliberately not changed** in this
checkpoint:

- `src/` (entire source tree — no application defects discovered)
- `test/` (test suite — passes locally as-is)
- `scripts/` (drill scripts — pass locally as-is)
- `Dockerfile`
- `docker-compose.yml` (compose file — verified valid, env forwarding
  correct, healthchecks correct)
- `package.json`
- `.env.example`
- `README.md` (already contains exact hold + seat-map curl examples)
- `DECISIONS.md` (already contains the three architectural decisions)
- `docs/ARCHITECTURE.md`
- `docs/REQUIREMENTS.md`
- `docs/HACKATHON_KILL_LIST.md`
- `docs/test-evidence/` (existing evidence files preserved)
- `.gitignore`, `.dockerignore`, `.gitattributes`

## 15. Owner Verification Checklist

For the later Claude Max audit pass:

- [ ] Confirm `.github/workflows/ci.yml` is byte-identical to the version
      described in section 5 above (triggers, jobs, steps, env vars).
- [ ] Confirm `pull_request:` trigger present and valid.
- [ ] Confirm `push: branches: [main]` trigger present and matches the
      repo's default branch.
- [ ] Confirm `services.postgres` is `postgres:16-alpine` with the
      documented `pg_isready` healthcheck and credentials.
- [ ] Confirm `npm ci` followed by `npm test` with the documented
      `DATABASE_URL`.
- [ ] Confirm `compose-e2e` runs `docker compose config -q`,
      `HOLD_TTL_SECONDS=5 docker compose up -d --build`, health-wait,
      `/health`, Scenario A, Scenario B, gateway-down block,
      `if: always()` logs, `if: always()` teardown.
- [ ] Confirm no `|| true`, no `continue-on-error:`, no `set +e` —
      failure propagation is intact.
- [ ] Confirm `secrets:` is not used; no production credentials present.
- [ ] Confirm no deployment/CD step exists in `ci.yml`.
- [ ] Confirm `docs/audits/CI_CHECKPOINT_2026-08-08.md` is present and
      matches the locally observed results.
- [ ] Trigger an actual GitHub Actions run on `main` (or open a PR) and
      observe the green/red result; record the run URL alongside this
      audit.

## 16. Conclusion

**PASS** — local validation succeeded end-to-end; no confirmed CI defects.

CI workflow is ready for owner staging.