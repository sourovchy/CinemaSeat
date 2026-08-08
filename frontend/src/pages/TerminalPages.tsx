import { Link, useParams } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync';
import { bookingsApi } from '../api/bookings';
import { showsApi } from '../api/catalog';
import { LoadingState, ErrorState } from '../components/States';
import { BookingConfirmation } from '../components/BookingConfirmation';
import type { Show } from '../types/api';

function useBookingAndShow(ref: string | undefined) {
  const bookingState = useAsync(
    () => (ref ? bookingsApi.get(ref) : Promise.reject(new Error('no ref'))),
    [ref],
  );
  const showState = useAsync(async () => (await showsApi.list()).shows, []);
  let show: Show | null = null;
  if (bookingState.data && showState.data) {
    show =
      showState.data.find((s) => s.id === bookingState.data!.show_id) ?? null;
  }
  return { bookingState, showState, show };
}

export function ConfirmedPage() {
  const { ref } = useParams<{ ref: string }>();
  const { bookingState, show } = useBookingAndShow(ref);

  if (bookingState.loading) return <LoadingState label="Loading booking…" />;
  if (bookingState.error)
    return (
      <ErrorState
        message={bookingState.error.message}
        onRetry={bookingState.reload}
      />
    );
  if (!bookingState.data) return null;

  return (
    <section className="page page-confirmation">
      <header className="page-header">
        <h1>Confirmation</h1>
      </header>
      <BookingConfirmation booking={bookingState.data} show={show} />
    </section>
  );
}

export function FailedPage() {
  const { ref } = useParams<{ ref: string }>();
  const { bookingState, show } = useBookingAndShow(ref);

  if (bookingState.loading) return <LoadingState label="Loading booking…" />;
  if (bookingState.error)
    return (
      <ErrorState
        message={bookingState.error.message}
        onRetry={bookingState.reload}
      />
    );
  if (!bookingState.data) return null;

  return (
    <section className="page page-failed">
      <header className="page-header">
        <h1>Payment failed</h1>
      </header>
      <div className="card state-error" role="alert">
        <strong>Your payment did not complete.</strong>
        <p>{show ? `${show.movie_title} · ${show.theatre_name}` : ''}</p>
        <p>
          Your seats have been released. You can return to the seat map and try
          again.
        </p>
        {show ? (
          <Link to={`/shows/${show.id}/seats`} className="btn btn-primary">
            Pick seats again
          </Link>
        ) : (
          <Link to="/" className="btn btn-primary">
            Back to movies
          </Link>
        )}
      </div>
    </section>
  );
}

export function ExpiredPage() {
  const { ref } = useParams<{ ref: string }>();
  const { bookingState, show } = useBookingAndShow(ref);

  if (bookingState.loading) return <LoadingState label="Loading booking…" />;
  if (bookingState.error)
    return (
      <ErrorState
        message={bookingState.error.message}
        onRetry={bookingState.reload}
      />
    );
  if (!bookingState.data) return null;

  return (
    <section className="page page-expired">
      <header className="page-header">
        <h1>Hold expired</h1>
      </header>
      <div className="card state-error" role="alert">
        <strong>Your hold has expired.</strong>
        <p>{show ? `${show.movie_title} · ${show.theatre_name}` : ''}</p>
        <p>The seats you picked have been released back to the pool.</p>
        {show ? (
          <Link to={`/shows/${show.id}/seats`} className="btn btn-primary">
            Pick seats again
          </Link>
        ) : (
          <Link to="/" className="btn btn-primary">
            Back to movies
          </Link>
        )}
      </div>
    </section>
  );
}

export function NotFoundPage() {
  return (
    <section className="page">
      <header className="page-header">
        <h1>Page not found</h1>
      </header>
      <p>The page you requested does not exist.</p>
      <Link to="/" className="btn btn-primary">
        Back to movies
      </Link>
    </section>
  );
}