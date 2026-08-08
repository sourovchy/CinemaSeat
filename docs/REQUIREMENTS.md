# CinemaSeat — Requirement Matrix

Status legend: ☐ not started · ◐ in progress · ✅ done and verified

| ID | Requirement | Mandatory | Implementation | Test | Status |
|----|-------------|-----------|----------------|------|--------|
| REQ-01 | Browse movies | M | `GET /api/movies` | integration | ☐ |
| REQ-02 | Browse theatres | M | `GET /api/theatres` | integration | ☐ |
| REQ-03 | Browse showtimes | M | `GET /api/shows` | integration | ☐ |
| REQ-04 | Seat map | M | `GET /api/shows/:id/seats` (effective status in SQL) | integration incl. hold/book/expiry states | ☐ |
| REQ-05 | Seat hold | M | `POST /api/shows/:id/hold` | integration | ☐ |
| REQ-06 | Atomic concurrency protection | M | row-per-(show,seat) + `FOR UPDATE` in seat order + conditional UPDATE | 2-way race + automated 100-concurrent same-seat | ☐ |
| REQ-07 | Hold expiration | M | lazy expiry in claims/reads (DB clock) + sweeper | Scenario B with short TTL | ☐ |
| REQ-08 | Payment integration | M | `/pay` → gateway `/charge`, returns 202 | `X-Mock-Force: success` | ☐ |
| REQ-09 | Async callback completes booking | M | `/api/payments/callback` | confirm arrives via callback only | ☐ |
| REQ-10 | Duplicate callback idempotency | M | `payment_events.event_id` PK + guarded transitions; always 200 | `X-Mock-Force: duplicate` | ☐ |
| REQ-11 | Race callback handling | M | attempt persisted before `/charge`; callback resolves by `booking_ref` | `X-Mock-Force: race` | ☐ |
| REQ-12 | Payment failure handling | M | FAILED cb → booking FAILED, seats released | `X-Mock-Force: fail` | ☐ |
| REQ-13 | OTP integration | M | proxy to provided gateway; verify gates payment | integration + gateway-down 503 | ☐ |
| REQ-14 | Health endpoint | M | static 200, zero dependencies | gateway stopped, < 1 s | ☐ |
| REQ-15 | `HOLD_TTL_SECONDS` from env | M | config module, never hardcoded | stack run with TTL=5 | ☐ |
| REQ-16 | Docker Compose full stack | M | app + db + provided gateway | clean-clone `docker compose up` | ◐ |
| REQ-17 | Clean clone startup | M | auto-migrate + auto-seed, compose defaults need no edits | clean-clone drill | ◐ |
| REQ-18 | CI on PRs + default-branch pushes | M | GitHub Actions: lint, tests, build | pipeline green | ☐ |
| REQ-19 | CD on default-branch pushes only | M | build/push image + deploy | pipeline green | ☐ |
| REQ-20 | Public deployment | M | Poridhi VM + load balancer | critical flows vs public URL | ☐ |
| REQ-21 | Scenario A evidence | M | k6 from laptop vs deployed URL | 100 sent / 1 held / 99 rejected / 0 oversell + seat map | ☐ |
| REQ-22 | Scenario B evidence | M | scripted timeline, short TTL | recorded in docs/test-evidence | ☐ |
| REQ-23 | README with exact hold + seat-map requests | M | README.md | judge dry-run of the curls | ☐ |
| REQ-24 | DECISIONS.md (3 genuine decisions) | M | DECISIONS.md | review | ☐ |
| REQ-25 | Superseded attempt cannot confirm booking | M (review) | `active_payment_id` invariant + `SUPERSEDED` state + refund path | timeout → retry → new succeeds → old callback arrives | ☐ |
| REQ-26 | Fault isolation: gateway down ⇒ browse/hold/health fine, no 500s | Bonus | 3 s timeouts, 503 only on pay/OTP; sweeper retries refunds | stop gateway container | ☐ |
| REQ-27 | Scenario C ramp test | Bonus | k6 ramp on seat-map + hold | p95 / error onset / bottleneck | ☐ |
