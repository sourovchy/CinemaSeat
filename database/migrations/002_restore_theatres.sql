-- Migration 002: Restore original theatres, screens.
-- Safe to run on existing database installations without violating constraints.

-- 1. Schema Change: Add address column to theatres if not exists.
ALTER TABLE theatres ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Data Repair: Upsert the 3 target theatres with correct names, cities, and addresses.
INSERT INTO theatres (id, name, city, address) VALUES
  (1, 'Sony Square, Mirpur', 'Dhaka', 'Sony Square, Level-4, Plot-1, Road-2, Block-D, Section-2, Mirpur, Dhaka-1216'),
  (2, 'Shimanto Shambhar, Dhanmondi 2', 'Dhaka', 'Level-9, Shimanto Shambhar, Pilkhana, Dhanmondi-2, Dhaka-1205'),
  (3, 'Bali Arcade, Chattogram', 'Chattogram', 'Level-9, Bali Arcade, 227 Nawab Sirajuddaula Road, Chawkbazar, Chattogram')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  address = EXCLUDED.address;

ALTER TABLE theatres ALTER COLUMN address SET NOT NULL;

-- 3. Screens: Upsert screens 1-9. Updates existing screens 1-4 and creates 5-9.
INSERT INTO screens (id, theatre_id, name, row_count, cols_per_row) VALUES
  (1, 1, 'Hall 1', 8, 10),
  (2, 1, 'Hall 2', 8, 10),
  (3, 1, 'Hall 3', 8, 10),
  (4, 2, 'Hall 1', 8, 10),
  (5, 2, 'Hall 2', 8, 10),
  (6, 2, 'Hall 3', 8, 10),
  (7, 3, 'Hall 1', 8, 10),
  (8, 3, 'Hall 2', 8, 10),
  (9, 3, 'Hall 3', 8, 10)
ON CONFLICT (id) DO UPDATE SET
  theatre_id = EXCLUDED.theatre_id,
  name = EXCLUDED.name,
  row_count = EXCLUDED.row_count,
  cols_per_row = EXCLUDED.cols_per_row;

-- 4. Seats: Idempotently generate seats for all screens.
INSERT INTO seats (id, screen_id, row_label, seat_number)
SELECT s.id * 1000 + (r - 1) * s.cols_per_row + n,
       s.id,
       chr(64 + r),
       n
FROM screens s
CROSS JOIN LATERAL generate_series(1, s.row_count) AS r
CROSS JOIN LATERAL generate_series(1, s.cols_per_row) AS n
ON CONFLICT (id) DO NOTHING;
