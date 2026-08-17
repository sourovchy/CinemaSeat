-- Idempotent seed data: fixed IDs + ON CONFLICT DO UPDATE, safe to run on
-- every application boot.

INSERT INTO movies (id, title, duration_min, rating, description) VALUES
  (1, 'Project Hail Mary',        156, 'PG-13', 'Ryland Grace is the sole survivor on a desperate, last-chance mission to save humanity from an extinction-level event.'),
  (2, 'Michael',                  127, 'PG-13', 'The biographical drama exploring the complicated life and legendary career of Michael Jackson.'),
  (3, 'Obsession',                108, 'R',     'A gripping thriller delving into secret desires, hidden motives, and deadly obsession.'),
  (4, 'The Odyssey',              173, 'PG-13', 'An epic retelling of Homer''s ancient Greek legend, following Odysseus on his decade-long journey home.'),
  (5, 'Spider-Man: Brand New Day', 145, 'PG-13', 'Peter Parker starts fresh in a new chapter of his life, facing unexpected threats and allies in New York City.')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  duration_min = EXCLUDED.duration_min,
  rating = EXCLUDED.rating,
  description = EXCLUDED.description;

INSERT INTO theatres (id, name, city, address) VALUES
  (1, 'Sony Square, Mirpur', 'Dhaka', 'Sony Square, Level-4, Plot-1, Road-2, Block-D, Section-2, Mirpur, Dhaka-1216'),
  (2, 'Shimanto Shambhar, Dhanmondi 2', 'Dhaka', 'Level-9, Shimanto Shambhar, Pilkhana, Dhanmondi-2, Dhaka-1205'),
  (3, 'Bali Arcade, Chattogram', 'Chattogram', 'Level-9, Bali Arcade, 227 Nawab Sirajuddaula Road, Chawkbazar, Chattogram')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  address = EXCLUDED.address;

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
