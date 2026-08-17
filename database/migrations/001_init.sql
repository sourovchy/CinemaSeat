-- CinemaSeat schema. See docs/ARCHITECTURE.md for the invariants each
-- constraint enforces.

CREATE TABLE movies (
  id           BIGINT PRIMARY KEY,
  title        TEXT NOT NULL,
  duration_min INT  NOT NULL CHECK (duration_min > 0),
  rating       TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE theatres (
  id   BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL
);

CREATE TABLE screens (
  id           BIGINT PRIMARY KEY,
  theatre_id   BIGINT NOT NULL REFERENCES theatres(id),
  name         TEXT NOT NULL,
  row_count    INT NOT NULL CHECK (row_count BETWEEN 1 AND 26),
  cols_per_row INT NOT NULL CHECK (cols_per_row BETWEEN 1 AND 99),
  UNIQUE (theatre_id, name)
);

CREATE TABLE seats (
  id          BIGINT PRIMARY KEY,
  screen_id   BIGINT NOT NULL REFERENCES screens(id),
  row_label   TEXT NOT NULL,
  seat_number INT NOT NULL,
  UNIQUE (screen_id, row_label, seat_number)
);

CREATE TABLE shows (
  id          BIGINT PRIMARY KEY,
  movie_id    BIGINT NOT NULL REFERENCES movies(id),
  screen_id   BIGINT NOT NULL REFERENCES screens(id),
  starts_at   TIMESTAMPTZ NOT NULL,
  price_cents BIGINT NOT NULL CHECK (price_cents > 0),
  UNIQUE (screen_id, starts_at)
);

CREATE TABLE bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref               TEXT NOT NULL UNIQUE,
  show_id           BIGINT NOT NULL REFERENCES shows(id),
  customer_name     TEXT NOT NULL,
  customer_phone    TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'HELD'
                    CHECK (status IN ('HELD','PAYMENT_PENDING','CONFIRMED',
                                      'FAILED','EXPIRED','CANCELLED')),
  amount_cents      BIGINT NOT NULL CHECK (amount_cents > 0),
  otp_verified_at   TIMESTAMPTZ,
  hold_expires_at   TIMESTAMPTZ NOT NULL,
  -- The ONE payment attempt allowed to confirm this booking.
  -- FK added below, after payments exists (circular reference).
  active_payment_id UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id         UUID NOT NULL REFERENCES bookings(id),
  -- Sent to the gateway as booking_ref; unique per attempt so callbacks can
  -- never cross wires between attempts (race + retry safety).
  attempt_ref        TEXT NOT NULL UNIQUE,
  gateway_payment_id TEXT UNIQUE,
  status             TEXT NOT NULL DEFAULT 'PENDING'
                     CHECK (status IN ('PENDING','SUCCEEDED','FAILED',
                                       'REFUNDED','SUPERSEDED')),
  -- Set when a SUCCEEDED callback arrives for a superseded attempt: the
  -- gateway charged money we must give back.
  needs_refund       BOOLEAN NOT NULL DEFAULT FALSE,
  amount_cents       BIGINT NOT NULL CHECK (amount_cents > 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- At most one in-flight attempt per booking, enforced by the database.
CREATE UNIQUE INDEX payments_one_pending_per_booking
  ON payments (booking_id) WHERE status = 'PENDING';

ALTER TABLE bookings
  ADD CONSTRAINT bookings_active_payment_fk
  FOREIGN KEY (active_payment_id) REFERENCES payments(id);

-- THE lock row: one row per (show, seat) arbitrates ownership.
CREATE TABLE show_seats (
  show_id         BIGINT NOT NULL REFERENCES shows(id),
  seat_id         BIGINT NOT NULL REFERENCES seats(id),
  status          TEXT NOT NULL DEFAULT 'AVAILABLE'
                  CHECK (status IN ('AVAILABLE','HELD','BOOKED')),
  booking_id      UUID REFERENCES bookings(id),
  hold_expires_at TIMESTAMPTZ,
  PRIMARY KEY (show_id, seat_id),
  -- A held or booked seat always has an owner; a held seat always expires.
  CHECK (status = 'AVAILABLE' OR booking_id IS NOT NULL),
  CHECK (status <> 'HELD' OR hold_expires_at IS NOT NULL)
);

CREATE INDEX show_seats_booking_idx ON show_seats (booking_id);
CREATE INDEX show_seats_expiry_idx  ON show_seats (hold_expires_at)
  WHERE status = 'HELD';

-- Idempotency anchor: the gateway's event_id is the primary key, so a
-- duplicate callback cannot even record itself twice.
CREATE TABLE payment_events (
  event_id    TEXT PRIMARY KEY,
  payment_id  TEXT,
  booking_ref TEXT,
  status      TEXT,
  payload     JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX bookings_sweep_idx ON bookings (status, hold_expires_at);
