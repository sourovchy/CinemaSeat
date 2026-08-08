-- Idempotent seed data: fixed IDs + ON CONFLICT DO NOTHING, safe to run on
-- every application boot.

INSERT INTO movies (id, title, duration_min, rating, description) VALUES
  (1, 'Interstellar',        169, 'PG-13', 'A team travels through a wormhole in search of a new home for humanity.'),
  (2, 'Inception',           148, 'PG-13', 'A thief who steals secrets through dream-sharing is given an impossible task.'),
  (3, 'The Dark Knight',     152, 'PG-13', 'Batman faces the Joker, a criminal mastermind bent on chaos.'),
  (4, 'Dune: Part Two',      166, 'PG-13', 'Paul Atreides unites with the Fremen to wage war against House Harkonnen.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO theatres (id, name, city) VALUES
  (1, 'Star Cineplex Bashundhara', 'Dhaka'),
  (2, 'Blockbuster Cinemas Jamuna', 'Dhaka')
ON CONFLICT (id) DO NOTHING;

INSERT INTO screens (id, theatre_id, name, row_count, cols_per_row) VALUES
  (1, 1, 'Screen 1', 8, 10),
  (2, 1, 'Screen 2', 8, 10),
  (3, 2, 'Screen A', 8, 10),
  (4, 2, 'Screen B', 8, 10)
ON CONFLICT (id) DO NOTHING;

-- Seat id scheme: screen_id * 1000 + (row-1) * cols + col  → stable, unique.
INSERT INTO seats (id, screen_id, row_label, seat_number)
SELECT s.id * 1000 + (r - 1) * s.cols_per_row + n,
       s.id,
       chr(64 + r),
       n
FROM screens s
CROSS JOIN LATERAL generate_series(1, s.row_count) AS r
CROSS JOIN LATERAL generate_series(1, s.cols_per_row) AS n
ON CONFLICT (id) DO NOTHING;

-- Fixed absolute timestamps keep re-seeding idempotent (UNIQUE screen+time).
INSERT INTO shows (id, movie_id, screen_id, starts_at, price_cents) VALUES
  ( 1, 1, 1, '2026-08-08 12:00:00+06', 45000),
  ( 2, 1, 1, '2026-08-08 18:00:00+06', 55000),
  ( 3, 2, 2, '2026-08-08 15:00:00+06', 45000),
  ( 4, 2, 2, '2026-08-08 21:00:00+06', 55000),
  ( 5, 3, 3, '2026-08-08 14:00:00+06', 40000),
  ( 6, 3, 3, '2026-08-08 20:00:00+06', 50000),
  ( 7, 4, 4, '2026-08-08 13:00:00+06', 60000),
  ( 8, 4, 4, '2026-08-08 19:00:00+06', 70000),
  ( 9, 1, 2, '2026-08-09 12:00:00+06', 45000),
  (10, 2, 1, '2026-08-09 15:00:00+06', 45000),
  (11, 3, 4, '2026-08-09 18:00:00+06', 50000),
  (12, 4, 3, '2026-08-09 21:00:00+06', 70000)
ON CONFLICT (id) DO NOTHING;

-- One bookable seat row per (show, seat of its screen).
INSERT INTO show_seats (show_id, seat_id)
SELECT sh.id, se.id
FROM shows sh
JOIN seats se ON se.screen_id = sh.screen_id
ON CONFLICT (show_id, seat_id) DO NOTHING;
