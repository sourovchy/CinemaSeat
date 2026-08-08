import crypto from 'node:crypto';
import { withTransaction } from '../platform/db.js';
import { config } from '../platform/config.js';

export class HoldError extends Error {
  constructor(code, httpStatus, details = {}) {
    super(code);
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

function newBookingRef() {
  return 'bk_' + crypto.randomBytes(6).toString('hex');
}

// Atomically claim `seatIds` for `showId`, all-or-nothing.
//
// PostgreSQL row locks on the show_seats primary-key rows are the ONLY
// concurrency mechanism: under a concurrent burst for the same seat, every
// transaction queues on FOR UPDATE of that one row; the first to commit flips
// it to HELD, and each later transaction re-reads the committed row (READ
// COMMITTED lock semantics), sees an active hold, and rejects cleanly. No
// application-level locks exist, so any number of app replicas stay correct.
async function holdSeatsOnce({ showId, seatIds, customerName, customerPhone }) {
  const uniqueSeatIds = [...new Set(seatIds)].sort((a, b) => a - b);

  return withTransaction(async (tx) => {
    const show = await tx.query(
      'SELECT id, price_cents FROM shows WHERE id = $1',
      [showId]
    );
    if (show.rowCount === 0) throw new HoldError('SHOW_NOT_FOUND', 404);

    // Lock the seat rows in deterministic ascending seat_id order so
    // overlapping multi-seat holds queue instead of deadlocking.
    const locked = await tx.query(
      `SELECT seat_id, status, hold_expires_at,
              (status = 'HELD' AND hold_expires_at <= now()) AS expired
         FROM show_seats
        WHERE show_id = $1 AND seat_id = ANY($2::bigint[])
        ORDER BY seat_id
        FOR UPDATE`,
      [showId, uniqueSeatIds]
    );

    if (locked.rowCount !== uniqueSeatIds.length) {
      const found = new Set(locked.rows.map((r) => r.seat_id));
      throw new HoldError('UNKNOWN_SEATS', 400, {
        unknown_seat_ids: uniqueSeatIds.filter((id) => !found.has(id)),
      });
    }

    // Re-read under lock: BOOKED and live HELD rows block the hold; an
    // expired HELD row is reclaimable (lazy expiry, database clock).
    const unavailable = locked.rows
      .filter((r) => r.status === 'BOOKED' || (r.status === 'HELD' && !r.expired))
      .map((r) => r.seat_id);
    if (unavailable.length > 0) {
      throw new HoldError('SEAT_UNAVAILABLE', 409, {
        unavailable_seat_ids: unavailable,
      });
    }

    const ttl = config.holdTtlSeconds;
    const amountCents = show.rows[0].price_cents * uniqueSeatIds.length;
    const booking = await tx.query(
      `INSERT INTO bookings (ref, show_id, customer_name, customer_phone,
                             status, amount_cents, hold_expires_at)
       VALUES ($1, $2, $3, $4, 'HELD', $5, now() + $6 * interval '1 second')
       RETURNING id, ref, hold_expires_at`,
      [newBookingRef(), showId, customerName, customerPhone, amountCents, ttl]
    );

    const claimed = await tx.query(
      `UPDATE show_seats
          SET status = 'HELD', booking_id = $3,
              hold_expires_at = now() + $4 * interval '1 second'
        WHERE show_id = $1 AND seat_id = ANY($2::bigint[])
          AND (status = 'AVAILABLE'
               OR (status = 'HELD' AND hold_expires_at <= now()))`,
      [showId, uniqueSeatIds, booking.rows[0].id, ttl]
    );
    // We hold the row locks and validated availability above; a short count
    // here means the invariant is in danger — never commit a partial claim.
    if (claimed.rowCount !== uniqueSeatIds.length) {
      throw new HoldError('SEAT_UNAVAILABLE', 409, {
        unavailable_seat_ids: uniqueSeatIds,
      });
    }

    return {
      booking_ref: booking.rows[0].ref,
      booking_id: booking.rows[0].id,
      show_id: showId,
      seat_ids: uniqueSeatIds,
      status: 'HELD',
      amount_cents: amountCents,
      hold_ttl_seconds: ttl,
      hold_expires_at: booking.rows[0].hold_expires_at,
    };
  });
}

export async function holdSeats(params) {
  try {
    return await holdSeatsOnce(params);
  } catch (err) {
    // bk_ ref collision (~2^48 space) or a deadlock would surface here; one
    // clean retry is enough for either.
    if (err.code === '23505' || err.code === '40P01') {
      return holdSeatsOnce(params);
    }
    throw err;
  }
}
