import { useAsync } from '../hooks/useAsync';
import { theatresApi, showsApi } from '../api/catalog';
import { LoadingState, ErrorState, EmptyState } from '../components/States';
import { Link } from 'react-router-dom';

export function BrowseTheatresPage() {
  const theatres = useAsync(
    () => theatresApi.list().then((r) => r.theatres),
    [],
  );
  const shows = useAsync(() => showsApi.list().then((r) => r.shows), []);

  if (theatres.loading || shows.loading) {
    return <LoadingState label="Loading theatres…" />;
  }
  if (theatres.error) {
    return <ErrorState message={theatres.error.message} onRetry={() => {
      theatres.reload();
      shows.reload();
    }} />;
  }
  if (!theatres.data || theatres.data.length === 0) {
    return <EmptyState message="No theatres found." />;
  }

  return (
    <section className="page page-theatres">
      <header className="page-header">
        <h1>Theatres</h1>
        <p className="hint">{theatres.data.length} theatres available.</p>
      </header>
      <div className="grid grid-theatres">
        {theatres.data.map((t) => {
          const count = (shows.data ?? []).filter(
            (s) => s.theatre_id === t.id,
          ).length;
          return (
            <article className="card" key={t.id}>
              <h3>{t.name}</h3>
              <p className="meta">{t.city}</p>
              <p className="hint">
                {count} show{count === 1 ? '' : 's'} available
              </p>
              <Link
                to={`/theatres/${t.id}/shows`}
                className="btn btn-primary"
                aria-label={`View shows at ${t.name}`}
              >
                View shows
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}