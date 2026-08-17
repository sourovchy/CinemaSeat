import { pool } from '../platform/db.js';

export async function catalogRoutes(app) {
  app.get('/movies', async () => {
    const { rows } = await pool.query(
      'SELECT id, title, duration_min, rating, description FROM movies ORDER BY id'
    );
    return { movies: rows };
  });

  app.get('/theatres', async () => {
    const { rows } = await pool.query(
      `SELECT t.id, t.name, t.city, t.address, COUNT(sc.id) AS halls_count
         FROM theatres t
         LEFT JOIN screens sc ON sc.theatre_id = t.id
        GROUP BY t.id, t.name, t.city, t.address
        ORDER BY t.id`
    );
    return { theatres: rows };
  });

  // Returns upcoming shows that started within the last 2 hours or in the future.
  app.get('/shows', async () => {
    const { rows } = await pool.query(
      `SELECT sh.id, sh.movie_id, m.title AS movie_title,
              t.id AS theatre_id, t.name AS theatre_name, t.city,
              sc.id AS screen_id, sc.name AS screen_name,
              sh.starts_at, sh.price_cents
         FROM shows sh
         JOIN movies m   ON m.id = sh.movie_id
         JOIN screens sc ON sc.id = sh.screen_id
         JOIN theatres t ON t.id = sc.theatre_id
        WHERE sh.starts_at >= now() - INTERVAL '2 hours'
        ORDER BY sh.starts_at, sh.id`
    );
    return { shows: rows };
  });

  app.get('/shows/:id/seats', async (req, reply) => {
    const showId = Number(req.params.id);
    if (!Number.isInteger(showId) || showId < 1) {
      return reply.code(400).send({ error: 'INVALID_SHOW_ID' });
    }
    const show = await pool.query('SELECT id FROM shows WHERE id = $1', [showId]);
    if (show.rowCount === 0) {
      return reply.code(404).send({ error: 'SHOW_NOT_FOUND' });
    }

    // Effective status: an expired hold is AVAILABLE the moment it expires
    // (database clock), even before the sweeper physically releases the row.
    const { rows } = await pool.query(
      `SELECT ss.seat_id, s.row_label, s.seat_number,
              CASE WHEN ss.status = 'HELD' AND ss.hold_expires_at <= now()
                   THEN 'AVAILABLE' ELSE ss.status END AS status
         FROM show_seats ss
         JOIN seats s ON s.id = ss.seat_id
        WHERE ss.show_id = $1
        ORDER BY s.row_label, s.seat_number`,
      [showId]
    );
    const summary = { available: 0, held: 0, booked: 0 };
    for (const r of rows) summary[r.status.toLowerCase()] += 1;
    return { show_id: showId, seats: rows, summary };
  });
}
