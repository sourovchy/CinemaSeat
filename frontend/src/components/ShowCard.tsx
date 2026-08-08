import { Link } from 'react-router-dom';
import type { Show } from '../types/api';
import { formatCents, formatDateTime } from '../lib/format';

interface ShowCardProps {
  show: Show;
}

export function ShowCard({ show }: ShowCardProps) {
  return (
    <article className="card show-card">
      <header>
        <h3>{show.movie_title}</h3>
      </header>
      <dl className="show-meta">
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
        <div>
          <dt>Price</dt>
          <dd>{formatCents(show.price_cents)}</dd>
        </div>
      </dl>
      <Link
        to={`/shows/${show.id}`}
        className="btn btn-primary"
        aria-label={`View details for show at ${show.theatre_name}`}
      >
        View details
      </Link>
    </article>
  );
}