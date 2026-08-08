import { Link } from 'react-router-dom';
import { formatCents, formatDateTime } from '../lib/format';
import type { Booking, Show } from '../types/api';

interface BookingConfirmationProps {
  booking: Booking;
  show: Show | null;
}

export function BookingConfirmation({ booking, show }: BookingConfirmationProps) {
  return (
    <section className="card booking-confirmation" aria-label="Booking confirmation">
      <h2>Booking confirmed</h2>
      <dl className="summary-meta">
        <div>
          <dt>Reference</dt>
          <dd className="mono">{booking.booking_ref}</dd>
        </div>
        {show ? (
          <>
            <div>
              <dt>Movie</dt>
              <dd>{show.movie_title}</dd>
            </div>
            <div>
              <dt>Theatre</dt>
              <dd>
                {show.theatre_name} · {show.city}
              </dd>
            </div>
            <div>
              <dt>Screen</dt>
              <dd>{show.screen_name}</dd>
            </div>
            <div>
              <dt>Starts</dt>
              <dd>{formatDateTime(show.starts_at)}</dd>
            </div>
          </>
        ) : null}
        <div>
          <dt>Seats</dt>
          <dd>{booking.seat_ids.length} seat(s)</dd>
        </div>
        <div>
          <dt>Amount paid</dt>
          <dd>{formatCents(booking.amount_cents)}</dd>
        </div>
      </dl>
      <p className="success-note">
        Keep your reference — it identifies your booking.
      </p>
      <Link to="/" className="btn btn-primary">
        Back to movies
      </Link>
    </section>
  );
}