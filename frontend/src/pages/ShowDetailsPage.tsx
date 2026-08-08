import { Link, useParams } from 'react-router-dom';
import { showsApi } from '../api/catalog';
import { useAsync } from '../hooks/useAsync';
import { LoadingState, ErrorState } from '../components/States';
import { formatCents, formatDateTime } from '../lib/format';

export function ShowDetailsPage() {
  const { showId } = useParams<{ showId: string }>();
  const id = Number(showId);
  const shows = useAsync(() => showsApi.list().then((r) => r.shows), []);

  if (shows.loading) return <LoadingState label="Loading show…" />;
  if (shows.error)
    return <ErrorState message={shows.error.message} onRetry={shows.reload} />;
  if (!shows.data) return null;

  const show = shows.data.find((s) => s.id === id);
  if (!show) {
    return (
      <section className="page">
        <header className="page-header">
          <h1>Show not found</h1>
        </header>
        <p>The requested show is not available.</p>
        <Link to="/" className="btn btn-secondary">
          Back to movies
        </Link>
      </section>
    );
  }

  return (
    <section className="page page-show-details">
      <header className="page-header">
        <h1>{show.movie_title}</h1>
        <p className="meta">
          {show.theatre_name} · {show.city} · {show.screen_name}
        </p>
        <p className="meta">
          Starts at {formatDateTime(show.starts_at)} · {formatCents(show.price_cents)}
        </p>
      </header>
      <Link to={`/shows/${show.id}/seats`} className="btn btn-primary">
        Choose seats
      </Link>
    </section>
  );
}