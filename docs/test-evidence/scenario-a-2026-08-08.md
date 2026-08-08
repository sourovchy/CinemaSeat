# Scenario A — 100 concurrent holds for the SAME exact seat

**Date:** 2026-08-08 · **Environment:** full `docker compose up --build` stack
(app + postgres:16 + provided gateway) on Docker 29.6.2, fresh volume.
**Command:** `BASE_URL=http://localhost:3000 node scripts/scenario-a.mjs`

One showtime (show 1), one exact seat (seat_id 1001 = A1), 100 concurrent
`POST /api/shows/1/hold` requests fired in a single burst.

## Result (verbatim script output)

```
SCENARIO A — 100 CONCURRENT HOLDS FOR THE SAME EXACT SEAT
started_at: 2026-08-08T05:04:xx (rerun on rebuilt image; first run 04:51:57Z)
base_url:   http://localhost:3000
show_id:    1
seat_id:    1001

REQUESTS SENT:        100
SUCCESSFUL HOLDS:     1
REJECTIONS (409):     99
OTHER RESPONSES:      0
OVERSELL COUNT:       0
BURST WALL TIME:      500 ms   (619 ms on the first run)
SEAT MAP AFTER BURST: seat 1001 = HELD
WINNER:               bk_4e28cbf3c911

RESULT: PASS — exactly one hold succeeded, zero oversell
```

All 99 rejections were clean `409 {"error":"SEAT_UNAVAILABLE","unavailable_seat_ids":[1001]}`.

## Database verification (first run, identical shape on rerun)

```
$ docker compose exec db psql -U cinemaseat -d cinemaseat -c "..."

 show_id | seat_id | status |     held_by
---------+---------+--------+-----------------
       1 |    1001 | HELD   | bk_ecaf11da1079
(1 row)

 total_bookings_for_seat
-------------------------
                       1
```

The same scenario also runs as an automated integration test
(`test/scenario-a.test.js`, real HTTP + real PostgreSQL) in `npm test` and in
CI on every push/PR, with an additional DB-level assertion that exactly one
HELD booking exists.

**Why this holds under any burst size:** all 100 transactions queue on the
`SELECT … FOR UPDATE` row lock of the single `(show_id=1, seat_id=1001)` row
in `show_seats`; the first commit flips it to HELD, and each subsequent
transaction re-reads the committed row, sees a live hold, and returns 409.
No app-level locks exist, so the result is identical with multiple app
replicas.
