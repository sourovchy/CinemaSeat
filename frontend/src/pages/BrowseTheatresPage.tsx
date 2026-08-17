import { useAsync } from '../hooks/useAsync';
import { theatresApi, showsApi } from '../api/catalog';
import { ErrorState, EmptyState } from '../components/States';
import { Link } from 'react-router-dom';
import { TheatreCardSkeleton } from '../components/ui/Skeleton';

const MapPinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export function BrowseTheatresPage() {
  const theatres = useAsync(
    () => theatresApi.list().then((r) => r.theatres),
    [],
  );
  const shows = useAsync(() => showsApi.list().then((r) => r.shows), []);

  if (theatres.loading || shows.loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Theatres</h1>
        </div>
        <div className="grid grid-theatres">
          {Array.from({ length: 2 }, (_, i) => (
            <TheatreCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (theatres.error) {
    return (
      <div className="page-container">
        <ErrorState message={theatres.error.message} onRetry={() => {
          theatres.reload();
          shows.reload();
        }} />
      </div>
    );
  }

  if (!theatres.data || theatres.data.length === 0) {
    return (
      <div className="page-container">
        <EmptyState
          title="No theatres available"
          message="There are no theatres registered in the system. Check back later."
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Theatres</h1>
        <p className="meta">{theatres.data.length} theatre{theatres.data.length === 1 ? '' : 's'} available</p>
      </div>

      <div className="grid grid-theatres">
        {theatres.data.map((t) => {
          const count = (shows.data ?? []).filter(
            (s) => s.theatre_id === t.id,
          ).length;
          return (
            <article className="theatre-card" key={t.id}>
              <h3>{t.name}</h3>
              <div className="theatre-location">
                <MapPinIcon />
                <span>{t.city}</span>
              </div>
              <p className="theatre-shows-count">
                {count} show{count === 1 ? '' : 's'} available
              </p>
              <Link
                to={`/theatres/${t.id}/shows`}
                className="btn btn-primary"
                aria-label={`View shows at ${t.name}`}
              >
                View Shows
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}