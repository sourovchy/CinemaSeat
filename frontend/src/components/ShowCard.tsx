import { Link } from 'react-router-dom';
import type { Show } from '../types/api';
import { formatCents, formatDateTime } from '../lib/format';

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const MapPinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

interface ShowCardProps {
  show: Show;
}

export function ShowCard({ show }: ShowCardProps) {
  return (
    <article className="show-card">
      <h3>{show.movie_title}</h3>
      <dl className="show-meta">
        <div>
          <dt>Theatre</dt>
          <dd>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <MapPinIcon />
              {show.theatre_name}
            </span>
          </dd>
        </div>
        <div>
          <dt>Screen</dt>
          <dd>{show.screen_name}</dd>
        </div>
        <div>
          <dt>Starts</dt>
          <dd>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ClockIcon />
              {formatDateTime(show.starts_at)}
            </span>
          </dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd style={{ color: 'var(--color-accent)' }}>{formatCents(show.price_cents)}</dd>
        </div>
      </dl>
      <Link
        to={`/shows/${show.id}`}
        className="btn btn-primary"
        aria-label={`View details for show at ${show.theatre_name}`}
      >
        View Details
      </Link>
    </article>
  );
}