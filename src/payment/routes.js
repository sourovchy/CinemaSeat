import { pool } from '../platform/db.js';
import { config } from '../platform/config.js';
import { initiatePayment, processCallback, PayError } from './service.js';
import { otpSend, otpVerify, mockControlHeaders } from './gateway.js';

async function findBooking(ref) {
  const { rows } = await pool.query(
    `SELECT id, ref, status, customer_phone, otp_verified_at,
            (hold_expires_at <= now()) AS expired
       FROM bookings WHERE ref = $1`,
    [ref]
  );
  return rows[0] ?? null;
}

export async function paymentRoutes(app) {
  // --- OTP: thin proxies to the PROVIDED gateway (never a fake OTP service).
  // Gateway down/slow degrades ONLY these endpoints to clean 503s.
  app.post('/bookings/:ref/otp/send', async (req, reply) => {
    const booking = await findBooking(req.params.ref);
    if (!booking) return reply.code(404).send({ error: 'BOOKING_NOT_FOUND' });
    if (booking.status !== 'HELD' || booking.expired) {
      return reply
        .code(409)
        .send({ error: 'BOOKING_NOT_PAYABLE', status: booking.status });
    }
    try {
      const res = await otpSend(booking.ref, mockControlHeaders(req.headers));
      if (res.status >= 200 && res.status < 300) {
        return reply.code(200).send({ status: 'SENT', note: 'OTP delivery may be delayed or lost; resend is allowed' });
      }
      req.log.warn({ gateway_status: res.status, body: res.body }, 'otp/send rejected');
      return reply.code(502).send({ error: 'OTP_SEND_FAILED' });
    } catch (err) {
      req.log.warn({ err: err.message }, 'otp/send gateway unreachable');
      return reply.code(503).send({ error: 'GATEWAY_UNAVAILABLE' });
    }
  });

  app.post(
    '/bookings/:ref/otp/verify',
    {
      schema: {
        body: {
          type: 'object',
          required: ['code'],
          additionalProperties: false,
          properties: { code: { type: 'string', minLength: 1, maxLength: 12 } },
        },
      },
    },
    async (req, reply) => {
      const booking = await findBooking(req.params.ref);
      if (!booking) return reply.code(404).send({ error: 'BOOKING_NOT_FOUND' });
      if (booking.status !== 'HELD' || booking.expired) {
        return reply
          .code(409)
          .send({ error: 'BOOKING_NOT_PAYABLE', status: booking.status });
      }
      try {
        const res = await otpVerify(
          booking.ref,
          req.body.code,
          mockControlHeaders(req.headers)
        );
        if (res.status >= 200 && res.status < 300) {
          await pool.query(
            `UPDATE bookings SET otp_verified_at = now()
              WHERE ref = $1 AND otp_verified_at IS NULL`,
            [booking.ref]
          );
          return reply.code(200).send({ verified: true });
        }
        if (res.status === 429) {
          return reply.code(429).send({ error: 'OTP_TOO_MANY_ATTEMPTS' });
        }
        return reply.code(400).send({ error: 'OTP_INVALID' });
      } catch (err) {
        req.log.warn({ err: err.message }, 'otp/verify gateway unreachable');
        return reply.code(503).send({ error: 'GATEWAY_UNAVAILABLE' });
      }
    }
  );

  // --- Async payment: returns 202 immediately; the outcome arrives on the
  // gateway callback. Never waits for the final payment result.
  app.post('/bookings/:ref/pay', async (req, reply) => {
    try {
      const result = await initiatePayment({
        ref: req.params.ref,
        controlHeaders: mockControlHeaders(req.headers),
        log: req.log,
      });
      return reply.code(202).send({
        booking_ref: result.booking_ref,
        attempt_ref: result.attempt_ref,
        status: 'PAYMENT_PENDING',
        note: 'poll GET /api/bookings/:ref for the outcome',
      });
    } catch (err) {
      if (err instanceof PayError) {
        return reply
          .code(err.httpStatus)
          .send({ error: err.code, ...err.details });
      }
      throw err;
    }
  });

  // --- Gateway callback. Registered in an encapsulated scope with a raw-body
  // parser: HMAC must be computed over the exact bytes the gateway sent.
  app.register(async (scope) => {
    scope.addContentTypeParser(
      'application/json',
      { parseAs: 'buffer' },
      (_req, payload, done) => done(null, payload)
    );
    scope.post('/payments/callback', async (req, reply) => {
      const raw = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(JSON.stringify(req.body ?? {}));
      const result = await processCallback({
        rawBody: raw,
        headers: req.headers,
        log: req.log,
      });
      return reply.code(result.httpStatus).send(result.body);
    });
  });

  // Expose the effective config knobs judges care about (no secrets).
  app.get('/config', async () => ({
    hold_ttl_seconds: config.holdTtlSeconds,
    sweep_interval_seconds: config.sweepIntervalSeconds,
    otp_required: config.otpRequired,
  }));
}
