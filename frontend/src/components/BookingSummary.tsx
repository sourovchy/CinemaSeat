import { formatCents } from '../lib/format';
import type { Show } from '../types/api';

interface BookingSummaryProps {
  show: Show | null;
  selectedSeatLabels: string[];
  totalCents: number;
}

export function BookingSummary({
  show,
  selectedSeatLabels,
  totalCents,
}: BookingSummaryProps) {
  return (
    <aside className="card booking-summary" aria-label="Booking summary">
      <h3>Your booking</h3>
      {show ? (
        <dl className="summary-meta">
          <div>
            <dt>Movie</dt>
            <dd>{show.movie_title}</dd>
          </div>
          <div>
            <dt>Theatre</dt>
            <dd>{show.theatre_name}</dd>
          </div>
          <div>
            <dt>Seats</dt>
            <dd>
              {selectedSeatLabels.length === 0
                ? '— none selected —'
                : selectedSeatLabels.join(', ')}
            </dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{formatCents(totalCents)}</dd>
          </div>
        </dl>
      ) : (
        <p>Loading show details…</p>
      )}
    </aside>
  );
}