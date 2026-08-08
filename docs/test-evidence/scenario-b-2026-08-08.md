# Scenario B — abandoned hold expires and the seat is reclaimed

**Date:** 2026-08-08 · **Environment:** compose stack restarted exactly as a
judge would: `HOLD_TTL_SECONDS=5 docker compose up -d app` (TTL from the
environment — HOOK 2). **Command:** `BASE_URL=http://localhost:3000 node scripts/scenario-b.mjs`

## Observed timeline (verbatim, first run)

```
[2026-08-08T04:52:39.768Z] stack reports HOLD_TTL_SECONDS=5 (from environment)
[2026-08-08T04:52:39.784Z] target: show 1, seat 1002
[2026-08-08T04:52:39.801Z] User A holds the seat: bk_3a5631e7a216 (expires 2026-08-08T04:52:44.800Z)
[2026-08-08T04:52:39.809Z] User B is cleanly rejected while the hold is live (409 SEAT_UNAVAILABLE)
[2026-08-08T04:52:39.815Z] seat map shows the seat as HELD
[2026-08-08T04:52:39.816Z] User A never pays; waiting 8s for expiry (TTL 5s + margin)…
[2026-08-08T04:52:47.827Z] hold expired: seat map shows the seat as AVAILABLE again
[2026-08-08T04:52:47.836Z] User A's booking now reads: EXPIRED
[2026-08-08T04:52:47.847Z] User B successfully holds the same seat: bk_66dbc3a37109
[2026-08-08T04:52:47.852Z] seat map shows the seat as HELD by User B

RESULT: PASS — abandoned hold released and reclaimed by another user
```

Rerun on the rebuilt image (05:05Z): identical PASS
(`bk_afab285e2c76` → expired → reclaimed by `bk_dcc6724f2f00`).

## Sweeper + database verification

App log (the sweeper physically materializes what lazy expiry already
guarantees logically):

```
{"seatsReleased":0,"bookingsExpired":1,"msg":"sweeper: released expired holds"}
{"seatsReleased":1,"bookingsExpired":1,"msg":"sweeper: released expired holds"}
```

(The first line shows the *lazy* path won the race: User B's new hold had
already reclaimed the seat row inside its own transaction, so only the
abandoned booking needed expiring.)

```
       ref       | status
-----------------+---------
 bk_3a5631e7a216 | EXPIRED     ← User A, never paid
 bk_66dbc3a37109 | (HELD, later EXPIRED — also unpaid, TTL 5s)

 seat_id |  status   | hold_expires_at
---------+-----------+-----------------
    1002 | AVAILABLE |                  ← after both holds lapsed
```

Two automated variants run in `npm test`/CI: `test/scenario-b.test.js`
(expiry + sweeper + reclaim, TTL=2) and a no-sweeper variant proving a new
hold can reclaim an expired seat purely via the lazy-expiry clause.
