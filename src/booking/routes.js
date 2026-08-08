import { pool } from '../platform/db.js';
import { holdSeats, HoldError } from './holds.js';

const holdBodySchema = {
  type: 'object',
  required: ['seat_ids', 'customer_name', 'customer_phone'],
  additionalProperties: false,
  properties: {
    seat_ids: {
      type: 'array',
      items: { type: 'integer', minimum: 1 },
      minItems: 1,
      maxItems: 10,
    },
    customer_name: { type: 'string', minLength: 1, maxLength: 100 },
    customer_phone: { type: 'string', minLength: 4, maxLength: 30 },
  },
};

export async function bookingRoutes(app) {
  app.post(
    '/shows/:id/hold',
    { schema: { body: holdBodySchema } },
    async (req, reply) => {
      const showId = Number(req.params.id);
      if (!Number.isInteger(showId) || showId < 1) {
        return reply.code(400).send({ error: 'INVALID_SHOW_ID' });
      }
      try {
        const result = await holdSeats({
          showId,
          seatIds: req.body.seat_ids,
          customerName: req.body.customer_name,
          customerPhone: req.body.customer_phone,
        });
        return reply.code(201).send(result);
      } catch (err) {
        if (err instanceof HoldError) {
          return reply
            .code(err.httpStatus)
            .send({ error: err.code, ...err.details });
        }
        throw err;
      }
    }
  );

  app.get('/bookings/:ref', async (req, reply) => {
    const { rows } = await pool.query(
      `SELECT b.ref AS booking_ref, b.show_id, b.customer_name,
              CASE WHEN b.status = 'HELD' AND b.hold_expires_at <= now()
                   THEN 'EXPIRED' ELSE b.status END AS status,
              b.amount_cents, b.hold_expires_at, b.otp_verified_at,
              b.created_at,
              p.attempt_ref, p.status AS payment_status,
              p.gateway_payment_id,
              COALESCE(
                (SELECT array_agg(ss.seat_id::int ORDER BY ss.seat_id)
                   FROM show_seats ss WHERE ss.booking_id = b.id),
                '{}'
              ) AS seat_ids
         FROM bookings b
         LEFT JOIN payments p ON p.id = b.active_payment_id
        WHERE b.ref = $1`,
      [req.params.ref]
    );
    if (rows.length === 0) {
      return reply.code(404).send({ error: 'BOOKING_NOT_FOUND' });
    }
    const b = rows[0];
    return {
      booking_ref: b.booking_ref,
      show_id: b.show_id,
      customer_name: b.customer_name,
      status: b.status,
      seat_ids: b.seat_ids,
      amount_cents: b.amount_cents,
      hold_expires_at: b.hold_expires_at,
      otp_verified: b.otp_verified_at !== null,
      payment:
        b.attempt_ref === null
          ? null
          : {
              attempt_ref: b.attempt_ref,
              status: b.payment_status,
              gateway_payment_id: b.gateway_payment_id,
            },
      created_at: b.created_at,
    };
  });
}
