import { pool } from '../platform/db.js';
import { config } from '../platform/config.js';
import { ensureUpcomingShows } from '../catalog/generator.js';

// Physically releases expired holds. Correctness never depends on this —
// every claim/read path already treats an expired hold as AVAILABLE (lazy
// expiry on the database clock); the sweeper just materializes that state.
//
// Two independent single-statement transactions, both SKIP LOCKED, so the
// sweeper can never deadlock with a live hold/pay/callback transaction:
// contended rows are simply picked up on a later sweep.
export async function sweepExpired() {
  const seats = await pool.query(
    `WITH expired AS (
       SELECT show_id, seat_id
         FROM show_seats
        WHERE status = 'HELD' AND hold_expires_at <= now()
        FOR UPDATE SKIP LOCKED
     )
     UPDATE show_seats ss
        SET status = 'AVAILABLE', booking_id = NULL, hold_expires_at = NULL
       FROM expired e
      WHERE ss.show_id = e.show_id AND ss.seat_id = e.seat_id`
  );
  // Also catches HELD bookings whose seats were already lazily reclaimed by
  // a later hold (those rows no longer point at this booking).
  const bookings = await pool.query(
    `UPDATE bookings
        SET status = 'EXPIRED'
      WHERE id IN (SELECT id FROM bookings
                    WHERE status = 'HELD' AND hold_expires_at <= now()
                    FOR UPDATE SKIP LOCKED)`
  );
  return { seatsReleased: seats.rowCount, bookingsExpired: bookings.rowCount };
}

export function startSweeper(log) {
  let running = false;
  let lastShowGenAt = 0;
  const timer = setInterval(async () => {
    if (running) return; // never overlap sweeps
    running = true;
    try {
      const r = await sweepExpired();
      if (r.seatsReleased || r.bookingsExpired) {
        log.info(r, 'sweeper: released expired holds');
      }

      // Periodically refresh rolling show window in background (every 10 minutes)
      const now = Date.now();
      if (now - lastShowGenAt >= 10 * 60 * 1000) {
        await ensureUpcomingShows();
        lastShowGenAt = now;
      }
    } catch (err) {
      log.error({ err: err.message }, 'sweeper: sweep failed');
    } finally {
      running = false;
    }
  }, config.sweepIntervalSeconds * 1000);
  timer.unref?.();
  return () => clearInterval(timer);
}
