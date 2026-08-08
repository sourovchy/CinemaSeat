import crypto from 'node:crypto';
import { pool, withTransaction } from '../platform/db.js';
import { config } from '../platform/config.js';
import { charge } from './gateway.js';

export class PayError extends Error {
  constructor(code, httpStatus, details = {}) {
    super(code);
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

// Locks every seat of a booking (deterministic seat order — same discipline
// as the hold path) and applies `set` to the rows still HELD by it.
async function lockBookingSeats(tx, bookingId) {
  const { rows } = await tx.query(
    `SELECT seat_id FROM show_seats
      WHERE booking_id = $1
      ORDER BY seat_id
      FOR UPDATE`,
    [bookingId]
  );
  return rows.length;
}

// POST /pay core. The payment attempt row is committed BEFORE the gateway
// hears about the charge, so a callback that arrives before /charge returns
// (X-Mock-Force: race) always finds its attempt by booking_ref.
export async function initiatePayment({ ref, controlHeaders, log }) {
  const prepared = await withTransaction(async (tx) => {
    const b = await tx.query(
      `SELECT id, ref, status, amount_cents, otp_verified_at,
              active_payment_id, (hold_expires_at <= now()) AS expired
         FROM bookings WHERE ref = $1 FOR UPDATE`,
      [ref]
    );
    if (b.rowCount === 0) throw new PayError('BOOKING_NOT_FOUND', 404);
    const bk = b.rows[0];

    if (bk.status === 'PAYMENT_PENDING') {
      // Re-drive the SAME attempt (same attempt_ref, same Idempotency-Key):
      // safe after a /charge 500/timeout because the gateway dedupes by key.
      const p = await tx.query(
        `SELECT id, attempt_ref, amount_cents, status
           FROM payments WHERE id = $1 FOR UPDATE`,
        [bk.active_payment_id]
      );
      if (p.rowCount === 1 && p.rows[0].status === 'PENDING') {
        return { booking: bk, attempt: p.rows[0], reused: true };
      }
      throw new PayError('PAYMENT_IN_PROGRESS', 409, { status: bk.status });
    }
    if (bk.status === 'CONFIRMED') throw new PayError('ALREADY_CONFIRMED', 409);
    if (bk.status !== 'HELD') {
      throw new PayError('BOOKING_NOT_PAYABLE', 409, { status: bk.status });
    }
    if (bk.expired) throw new PayError('HOLD_EXPIRED', 409);
    if (config.otpRequired && bk.otp_verified_at === null) {
      throw new PayError('OTP_REQUIRED', 403);
    }

    const n = await tx.query(
      'SELECT count(*)::int AS c FROM payments WHERE booking_id = $1',
      [bk.id]
    );
    const attemptRef = `${bk.ref}-a${n.rows[0].c + 1}`;
    const attempt = await tx.query(
      `INSERT INTO payments (booking_id, attempt_ref, amount_cents)
       VALUES ($1, $2, $3)
       RETURNING id, attempt_ref, amount_cents, status`,
      [bk.id, attemptRef, bk.amount_cents]
    );

    await tx.query(
      `UPDATE bookings
          SET status = 'PAYMENT_PENDING', active_payment_id = $2,
              hold_expires_at = now() + $3 * interval '1 second'
        WHERE id = $1`,
      [bk.id, attempt.rows[0].id, config.paymentPendingTimeoutSeconds]
    );
    // Extend the seat holds so the lazy-expiry clause cannot give the seats
    // away while the gateway is still deciding (2–15 s callbacks).
    await lockBookingSeats(tx, bk.id);
    await tx.query(
      `UPDATE show_seats
          SET hold_expires_at = now() + $2 * interval '1 second'
        WHERE booking_id = $1 AND status = 'HELD'`,
      [bk.id, config.paymentPendingTimeoutSeconds]
    );

    return { booking: bk, attempt: attempt.rows[0], reused: false };
  });

  // Gateway call OUTSIDE the transaction: the attempt already exists.
  const res = await charge({
    amountCents: prepared.attempt.amount_cents,
    bookingRef: prepared.attempt.attempt_ref,
    callbackUrl: config.publicCallbackUrl,
    idempotencyKey: prepared.attempt.attempt_ref,
    controlHeaders,
  }).catch((err) => {
    log?.warn({ err: err.message }, 'gateway /charge unreachable');
    return null;
  });

  if (res && res.status === 202 && res.body?.payment_id) {
    // Reconcile the gateway's payment_id with the attempt. The callback may
    // already have stored it (race mode) — the IS NULL guard keeps the first.
    await pool.query(
      `UPDATE payments SET gateway_payment_id = $2
        WHERE attempt_ref = $1 AND gateway_payment_id IS NULL`,
      [prepared.attempt.attempt_ref, res.body.payment_id]
    );
    return {
      accepted: true,
      booking_ref: prepared.booking.ref,
      attempt_ref: prepared.attempt.attempt_ref,
      reused: prepared.reused,
    };
  }

  // 500/timeout/unreachable: the attempt stays PENDING; the client may POST
  // /pay again and we re-drive the same attempt with the same key.
  log?.warn(
    { attempt_ref: prepared.attempt.attempt_ref, gateway_status: res?.status ?? 'unreachable' },
    'gateway /charge did not accept'
  );
  throw new PayError('GATEWAY_ERROR', 503, { retryable: true });
}

function verifySignature(rawBody, headers, log) {
  const mode = config.gatewaySignatureMode;
  if (mode === 'off') return true;
  const given = String(headers['x-signature'] ?? '').replace(/^sha256=/, '');
  const expected = crypto
    .createHmac('sha256', config.gatewaySecret)
    .update(rawBody) // RAW bytes — never re-serialized JSON
    .digest('hex');
  const ok =
    given.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) {
    log?.warn({ mode, given }, 'callback signature mismatch');
    if (mode === 'enforce') return false;
  }
  return true;
}

// Callback processing. Everything happens in ONE transaction including the
// payment_events insert, so a failure rolls the event back too and the
// gateway's retry can reprocess it. Three independent idempotency layers:
// the event_id primary key, the status='PENDING' guard on the attempt, and
// the status guards on booking/seat transitions.
export async function processCallback({ rawBody, headers, log }) {
  if (!verifySignature(rawBody, headers, log)) {
    return { httpStatus: 401, body: { error: 'BAD_SIGNATURE' } };
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    log?.warn('callback: malformed JSON body');
    return { httpStatus: 200, body: { ok: true, note: 'malformed' } };
  }
  const { event_id, payment_id, booking_ref, status } = event ?? {};
  if (typeof event_id !== 'string' || event_id.length === 0) {
    log?.warn({ event }, 'callback: missing event_id');
    return { httpStatus: 200, body: { ok: true, note: 'missing event_id' } };
  }

  const outcome = await withTransaction(async (tx) => {
    const inserted = await tx.query(
      `INSERT INTO payment_events (event_id, payment_id, booking_ref, status, payload)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (event_id) DO NOTHING`,
      [event_id, payment_id ?? null, booking_ref ?? null, status ?? null, JSON.stringify(event)]
    );
    if (inserted.rowCount === 0) return { note: 'duplicate' };

    // Resolve the attempt by booking_ref (= our per-attempt attempt_ref).
    // This works even when the callback beats the /charge response, because
    // the attempt row was committed before /charge was called.
    const found = await tx.query(
      'SELECT id, booking_id FROM payments WHERE attempt_ref = $1',
      [booking_ref ?? '']
    );
    if (found.rowCount === 0) {
      log?.warn({ booking_ref, event_id }, 'callback: unknown booking_ref');
      return { note: 'unknown booking_ref' };
    }

    // Deterministic lock order everywhere: booking row, then payment row,
    // then seat rows in seat_id order.
    const bq = await tx.query(
      `SELECT id, ref, status, active_payment_id FROM bookings
        WHERE id = $1 FOR UPDATE`,
      [found.rows[0].booking_id]
    );
    const booking = bq.rows[0];
    const pq = await tx.query(
      'SELECT * FROM payments WHERE id = $1 FOR UPDATE',
      [found.rows[0].id]
    );
    const attempt = pq.rows[0];

    if (attempt.gateway_payment_id === null && typeof payment_id === 'string') {
      await tx.query(
        `UPDATE payments SET gateway_payment_id = $2
          WHERE id = $1 AND gateway_payment_id IS NULL`,
        [attempt.id, payment_id]
      );
    }

    const isActive = booking.active_payment_id === attempt.id;

    if (status === 'SUCCEEDED') {
      const moved = await tx.query(
        `UPDATE payments SET status = 'SUCCEEDED'
          WHERE id = $1 AND status = 'PENDING'`,
        [attempt.id]
      );
      if (moved.rowCount === 0) return { note: 'attempt already terminal' };

      if (!isActive || booking.status !== 'PAYMENT_PENDING') {
        // Money was taken on an attempt that may no longer confirm the
        // booking: flag for refund reconciliation, never confirm.
        await tx.query(
          'UPDATE payments SET needs_refund = TRUE WHERE id = $1',
          [attempt.id]
        );
        log?.warn(
          { attempt_ref: attempt.attempt_ref, booking_status: booking.status },
          'callback: SUCCEEDED on non-confirmable attempt — flagged for refund'
        );
        return { note: 'needs refund' };
      }

      const seatCount = await lockBookingSeats(tx, booking.id);
      const bookedSeats = await tx.query(
        `UPDATE show_seats
            SET status = 'BOOKED', hold_expires_at = NULL
          WHERE booking_id = $1 AND status = 'HELD'`,
        [booking.id]
      );
      if (seatCount === 0 || bookedSeats.rowCount !== seatCount) {
        // Seats were lost (stuck payment outliving the safety window).
        await tx.query(
          'UPDATE payments SET needs_refund = TRUE WHERE id = $1',
          [attempt.id]
        );
        await tx.query(
          `UPDATE bookings SET status = 'FAILED'
            WHERE id = $1 AND status = 'PAYMENT_PENDING'`,
          [booking.id]
        );
        log?.error(
          { booking_ref: booking.ref, seatCount, booked: bookedSeats.rowCount },
          'callback: seats lost before confirmation — booking FAILED, refund flagged'
        );
        return { note: 'seats lost, refund flagged' };
      }
      await tx.query(
        `UPDATE bookings SET status = 'CONFIRMED'
          WHERE id = $1 AND status = 'PAYMENT_PENDING'`,
        [booking.id]
      );
      return { note: 'confirmed' };
    }

    if (status === 'FAILED') {
      const moved = await tx.query(
        `UPDATE payments SET status = 'FAILED'
          WHERE id = $1 AND status = 'PENDING'`,
        [attempt.id]
      );
      if (moved.rowCount === 0) return { note: 'attempt already terminal' };
      if (isActive && booking.status === 'PAYMENT_PENDING') {
        await tx.query(
          `UPDATE bookings SET status = 'FAILED'
            WHERE id = $1 AND status = 'PAYMENT_PENDING'`,
          [booking.id]
        );
        await lockBookingSeats(tx, booking.id);
        await tx.query(
          `UPDATE show_seats
              SET status = 'AVAILABLE', booking_id = NULL, hold_expires_at = NULL
            WHERE booking_id = $1 AND status = 'HELD'`,
          [booking.id]
        );
      }
      return { note: 'failed' };
    }

    if (status === 'REFUNDED') {
      await tx.query(
        `UPDATE payments
            SET status = 'REFUNDED', needs_refund = FALSE
          WHERE id = $1 AND status IN ('SUCCEEDED', 'SUPERSEDED')`,
        [attempt.id]
      );
      return { note: 'refunded' };
    }

    log?.warn({ status, event_id }, 'callback: unknown status');
    return { note: 'unknown status' };
  });

  return { httpStatus: 200, body: { ok: true, ...outcome } };
}
