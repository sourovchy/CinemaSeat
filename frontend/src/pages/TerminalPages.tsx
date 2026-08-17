import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync';
import { bookingsApi } from '../api/bookings';
import { showsApi, moviesApi } from '../api/catalog';
import { LoadingState, ErrorState } from '../components/States';
import { enrichMovie, getEnrichedMovie } from '../services/movieEnrichment';
import { formatCents } from '../lib/format';
import type { Show } from '../types/api';
import type { CinemaMovie } from '../types/movie';

function useBookingAndShow(ref: string | undefined) {
  const bookingState = useAsync(
    () => (ref ? bookingsApi.get(ref) : Promise.reject(new Error('no ref'))),
    [ref],
  );
  const showState = useAsync(async () => (await showsApi.list()).shows, []);
  const moviesState = useAsync(async () => (await moviesApi.list()).movies, []);

  let show: Show | null = null;
  if (bookingState.data && showState.data) {
    show =
      showState.data.find((s) => s.id === bookingState.data!.show_id) ?? null;
  }

  // Enrich movie for poster
  const [enrichedMovie, setEnrichedMovie] = useState<CinemaMovie | null>(null);
  useEffect(() => {
    if (!show || !moviesState.data) return;
    const movie = moviesState.data.find((m) => m.id === show!.movie_id);
    if (!movie) return;
    const cached = getEnrichedMovie(movie.id);
    if (cached) { setEnrichedMovie(cached); return; }
    let cancelled = false;
    enrichMovie(movie).then((r) => { if (!cancelled) setEnrichedMovie(r); });
    return () => { cancelled = true; };
  }, [show, moviesState.data]);

  return { bookingState, showState, show, enrichedMovie };
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return iso;
  }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return iso;
  }
}

export function ConfirmedPage() {
  const { ref } = useParams<{ ref: string }>();
  const { bookingState, show, enrichedMovie } = useBookingAndShow(ref);

  if (bookingState.loading) return <div className="page-container"><LoadingState label="Loading booking…" /></div>;
  if (bookingState.error)
    return (
      <div className="page-container">
        <ErrorState
          message={bookingState.error.message}
          onRetry={bookingState.reload}
        />
      </div>
    );
  if (!bookingState.data) return null;

  const booking = bookingState.data;

  // Decode seat IDs to row/column labels
  const decodedSeats = booking.seat_ids
    .map((sid) => {
      const rowIdx = Math.floor(sid / 100) - 1;
      const seatNum = sid % 100;
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q'];
      const rowLabel = rows[rowIdx] || `R${rowIdx + 1}`;
      return `${rowLabel}${seatNum}`;
    })
    .sort()
    .join(', ');

  return (
    <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - var(--nav-height) - 200px)' }}>
      <div className="confirmation-ticket" style={{ width: '100%', maxWidth: '520px', marginInline: 'auto' }}>
        <div className="ticket-header">
          <div className="ticket-check" aria-hidden="true" style={{ background: 'var(--color-green-muted)', color: 'var(--color-green)' }}>✓</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>Booking Confirmed</h2>
          <p>Your tickets have been issued successfully</p>
        </div>

        {enrichedMovie?.posterUrl && (
          <div className="ticket-poster" style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
            <img
              src={enrichedMovie.posterUrl}
              alt={`${show?.movie_title ?? 'Movie'} poster`}
              loading="lazy"
              style={{ width: '120px', height: '180px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
            />
          </div>
        )}

        <div className="ticket-divider" />

        <div className="ticket-details">
          {show && (
            <>
              <div className="ticket-detail-row">
                <span className="ticket-detail-label">Movie</span>
                <span className="ticket-detail-value" style={{ fontWeight: 700 }}>{show.movie_title}</span>
              </div>
              <div className="ticket-detail-row">
                <span className="ticket-detail-label">Theatre</span>
                <span className="ticket-detail-value">{show.theatre_name}</span>
              </div>
              <div className="ticket-detail-row">
                <span className="ticket-detail-label">Hall</span>
                <span className="ticket-detail-value">{show.screen_name}</span>
              </div>
              <div className="ticket-detail-row">
                <span className="ticket-detail-label">Date</span>
                <span className="ticket-detail-value">{formatDate(show.starts_at)}</span>
              </div>
              <div className="ticket-detail-row">
                <span className="ticket-detail-label">Time</span>
                <span className="ticket-detail-value">{formatTime(show.starts_at)}</span>
              </div>
            </>
          )}
          <div className="ticket-detail-row">
            <span className="ticket-detail-label">Seats</span>
            <span className="ticket-detail-value" style={{ fontWeight: 700, color: 'var(--color-highlight)' }}>{decodedSeats}</span>
          </div>
          <div className="ticket-detail-row">
            <span className="ticket-detail-label">Quantity</span>
            <span className="ticket-detail-value">{booking.seat_ids.length} Ticket{booking.seat_ids.length === 1 ? '' : 's'}</span>
          </div>
          <div className="ticket-detail-row">
            <span className="ticket-detail-label">Reference</span>
            <span className="ticket-detail-value mono-val" style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{booking.booking_ref}</span>
          </div>
          <div className="ticket-detail-row">
            <span className="ticket-detail-label">Total</span>
            <span className="ticket-detail-value ticket-total" style={{ color: 'var(--color-accent)', fontWeight: 800, fontSize: 'var(--text-lg)' }}>{formatCents(booking.amount_cents + (booking.seat_ids.length > 0 ? 4000 : 0))}</span>
          </div>
        </div>

        <div className="ticket-actions" style={{ padding: '0 var(--space-6) var(--space-6)' }}>
          <div className="success-note" style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
            Present this booking reference at the counter to collect your physical tickets.
          </div>
          <Link to="/" className="btn btn-primary btn-block">
            Back to Movies
          </Link>
        </div>
      </div>
    </div>
  );
}

export function FailedPage() {
  const { ref } = useParams<{ ref: string }>();
  const { bookingState, show } = useBookingAndShow(ref);

  if (bookingState.loading) return <div className="page-container"><LoadingState label="Loading booking…" /></div>;
  if (bookingState.error)
    return (
      <div className="page-container">
        <ErrorState
          message={bookingState.error.message}
          onRetry={bookingState.reload}
        />
      </div>
    );
  if (!bookingState.data) return null;

  return (
    <div className="page-container">
      <div className="state state-error" style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="state-icon">✕</div>
        <strong>Payment Failed</strong>
        <p>
          Your payment could not be completed.
          {show ? ` Your seats for ${show.movie_title} at ${show.theatre_name} have been released.` : ''}
        </p>
        <p>You can return to the seat map and try again.</p>
        <div className="state-action" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {show ? (
            <Link to={`/shows/${show.id}/seats`} className="btn btn-primary">
              Pick Seats Again
            </Link>
          ) : null}
          <Link to="/" className="btn btn-secondary">
            Back to Movies
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ExpiredPage() {
  const { ref } = useParams<{ ref: string }>();
  const { bookingState, show } = useBookingAndShow(ref);

  if (bookingState.loading) return <div className="page-container"><LoadingState label="Loading booking…" /></div>;
  if (bookingState.error)
    return (
      <div className="page-container">
        <ErrorState
          message={bookingState.error.message}
          onRetry={bookingState.reload}
        />
      </div>
    );
  if (!bookingState.data) return null;

  return (
    <div className="page-container">
      <div className="state state-warning" style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="state-icon">⏱</div>
        <strong>Seat Hold Expired</strong>
        <p>
          Your seat hold has expired before payment was completed.
          {show ? ` The seats for ${show.movie_title} at ${show.theatre_name} have been released back.` : ''}
        </p>
        <p>You can go back and select your seats again.</p>
        <div className="state-action" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {show ? (
            <Link to={`/shows/${show.id}/seats`} className="btn btn-primary">
              Select Seats Again
            </Link>
          ) : null}
          <Link to="/" className="btn btn-secondary">
            Back to Movies
          </Link>
        </div>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="page-container">
      <div className="state" style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="state-icon" style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>?</div>
        <strong>Page Not Found</strong>
        <p>The page you're looking for doesn't exist or may have been moved.</p>
        <div className="state-action">
          <Link to="/" className="btn btn-primary">
            Back to Movies
          </Link>
        </div>
      </div>
    </div>
  );
}