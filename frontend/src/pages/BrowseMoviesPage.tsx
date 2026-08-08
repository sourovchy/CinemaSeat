import { Link } from 'react-router-dom';
import { moviesApi, theatresApi, showsApi } from '../api/catalog';
import { useAsync } from '../hooks/useAsync';
import { LoadingState, ErrorState, EmptyState } from '../components/States';
import { MovieCard } from '../components/MovieCard';

export function BrowseMoviesPage() {
  const movies = useAsync(() => moviesApi.list().then((r) => r.movies), []);
  const theatres = useAsync(
    () => theatresApi.list().then((r) => r.theatres),
    [],
  );
  const shows = useAsync(() => showsApi.list().then((r) => r.shows), []);

  if (movies.loading || theatres.loading || shows.loading) {
    return <LoadingState label="Loading movies…" />;
  }
  if (movies.error) {
    return (
      <ErrorState
        message={movies.error.message}
        onRetry={() => {
          movies.reload();
          theatres.reload();
          shows.reload();
        }}
      />
    );
  }
  if (!movies.data || movies.data.length === 0) {
    return <EmptyState message="No movies available right now." />;
  }

  return (
    <section className="page page-browse">
      <header className="page-header">
        <h1>Now showing</h1>
        <p className="hint">
          Pick a movie to see available shows.
          {' '}
          {theatres.data ? `${theatres.data.length} theatres · ` : ''}
          {shows.data ? `${shows.data.length} shows` : ''}
        </p>
      </header>
      <div className="grid grid-movies">
        {movies.data.map((m) => (
          <MovieCard movie={m} key={m.id} />
        ))}
      </div>
      <p className="hint">
        Want to browse by theatre? <Link to="/theatres">See all theatres</Link>.
      </p>
    </section>
  );
}