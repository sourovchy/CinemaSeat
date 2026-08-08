import { useParams, Link } from 'react-router-dom';
import { moviesApi, showsApi, theatresApi } from '../api/catalog';
import { useAsync } from '../hooks/useAsync';
import { LoadingState, ErrorState, EmptyState } from '../components/States';
import { ShowCard } from '../components/ShowCard';

interface BrowseShowsParams extends Record<string, string | undefined> {
  movieId?: string;
  theatreId?: string;
}

export function BrowseShowsPage() {
  const { movieId, theatreId } = useParams<BrowseShowsParams>();
  const isMovieScope = Boolean(movieId);
  const isTheatreScope = Boolean(theatreId);

  const shows = useAsync(() => showsApi.list().then((r) => r.shows), []);
  const movies = useAsync(
    () => moviesApi.list().then((r) => r.movies),
    [],
  );
  const theatres = useAsync(
    () => theatresApi.list().then((r) => r.theatres),
    [],
  );

  if (shows.loading || movies.loading || theatres.loading) {
    return <LoadingState label="Loading shows…" />;
  }
  if (shows.error) {
    return (
      <ErrorState
        message={shows.error.message}
        onRetry={() => {
          shows.reload();
          movies.reload();
          theatres.reload();
        }}
      />
    );
  }
  if (!shows.data) {
    return <EmptyState message="No shows available." />;
  }

  let filtered = shows.data;
  let title = 'All shows';
  if (isMovieScope && movieId) {
    const mid = Number(movieId);
    const movie = movies.data?.find((m) => m.id === mid);
    filtered = filtered.filter((s) => s.movie_id === mid);
    title = movie ? `Shows — ${movie.title}` : `Shows for movie #${mid}`;
  } else if (isTheatreScope && theatreId) {
    const tid = Number(theatreId);
    const theatre = theatres.data?.find((t) => t.id === tid);
    filtered = filtered.filter((s) => s.theatre_id === tid);
    title = theatre ? `Shows — ${theatre.name}` : `Shows for theatre #${tid}`;
  }

  if (filtered.length === 0) {
    return (
      <section className="page">
        <header className="page-header">
          <h1>{title}</h1>
        </header>
        <EmptyState message="No shows scheduled." />
        <Link to="/" className="btn btn-secondary">
          Back to movies
        </Link>
      </section>
    );
  }

  return (
    <section className="page page-shows">
      <header className="page-header">
        <h1>{title}</h1>
        <p className="hint">
          {filtered.length} show{filtered.length === 1 ? '' : 's'} available.
        </p>
      </header>
      <div className="grid grid-shows">
        {filtered.map((s) => (
          <ShowCard show={s} key={s.id} />
        ))}
      </div>
    </section>
  );
}