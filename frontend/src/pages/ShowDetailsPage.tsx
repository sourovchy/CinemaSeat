import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { moviesApi, showsApi } from '../api/catalog';
import { useAsync } from '../hooks/useAsync';
import { ErrorState, EmptyState } from '../components/States';
import { HeroSkeleton } from '../components/ui/Skeleton';
import { enrichMovie, getEnrichedMovie, formatReleaseDate } from '../services/movieEnrichment';
import { formatCents, formatDateTime } from '../lib/format';
import type { CinemaMovie } from '../types/movie';
import type { Show } from '../types/api';

const StarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export function ShowDetailsPage() {
  const { showId } = useParams<{ showId: string }>();
  const id = Number(showId);

  const shows = useAsync(() => showsApi.list().then((r) => r.shows), []);
  const movies = useAsync(() => moviesApi.list().then((r) => r.movies), []);

  const show: Show | null = useMemo(() => {
    if (!shows.data) return null;
    return shows.data.find((s) => s.id === id) ?? null;
  }, [shows.data, id]);

  // Enrich the movie for this show
  const [enrichedMovie, setEnrichedMovie] = useState<CinemaMovie | null>(null);
  useEffect(() => {
    if (!show || !movies.data) return;
    const movie = movies.data.find((m) => m.id === show.movie_id);
    if (!movie) return;

    const cached = getEnrichedMovie(movie.id);
    if (cached) {
      setEnrichedMovie(cached);
      return;
    }

    let cancelled = false;
    enrichMovie(movie).then((result) => {
      if (!cancelled) setEnrichedMovie(result);
    });
    return () => { cancelled = true; };
  }, [show, movies.data]);

  // Get other shows for the same movie
  const relatedShows = useMemo(() => {
    if (!shows.data || !show) return [];
    return shows.data.filter((s) => s.movie_id === show.movie_id && s.id !== show.id);
  }, [shows.data, show]);

  if (shows.loading || movies.loading) {
    return <HeroSkeleton />;
  }

  if (shows.error) {
    return (
      <div className="page-container">
        <ErrorState message={shows.error.message} onRetry={shows.reload} />
      </div>
    );
  }

  if (!show) {
    return (
      <div className="page-container">
        <EmptyState
          title="Show not found"
          message="The requested show is not available or may have been removed."
        />
        <div style={{ marginTop: 16 }}>
          <Link to="/" className="btn btn-secondary">Back to Movies</Link>
        </div>
      </div>
    );
  }

  const formattedDate = enrichedMovie ? formatReleaseDate(enrichedMovie.releaseDate) : null;

  return (
    <>
      {/* Hero with movie backdrop */}
      <div className="detail-hero">
        <div className="hero-backdrop">
          {enrichedMovie?.backdropUrl ? (
            <img src={enrichedMovie.backdropUrl} alt="" loading="eager" />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'var(--color-bg-elevated)' }} />
          )}
        </div>
        <div className="detail-hero-content">
          {enrichedMovie?.posterUrl && (
            <div className="detail-poster">
              <img
                src={enrichedMovie.posterUrl}
                alt={`${show.movie_title} poster`}
              />
            </div>
          )}
          <div className="detail-info">
            <h1>{show.movie_title}</h1>
            <div className="hero-meta" style={{ marginBottom: 'var(--space-3)' }}>
              {enrichedMovie && (
                <span className="badge badge-accent">{enrichedMovie.rating}</span>
              )}
              {formattedDate && (
                <>
                  <span className="meta-dot" />
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-accent)', fontWeight: 600 }}>
                    <CalendarIcon /> {formattedDate}
                  </span>
                </>
              )}
              {enrichedMovie?.tmdbRating != null && (
                <>
                  <span className="meta-dot" />
                  <span className="poster-card-rating" style={{ fontSize: 'var(--text-sm)' }}>
                    <StarIcon /> {enrichedMovie.tmdbRating.toFixed(1)}
                  </span>
                </>
              )}
              {enrichedMovie && enrichedMovie.duration_min > 0 && (
                <>
                  <span className="meta-dot" />
                  <span>{enrichedMovie.duration_min} min</span>
                </>
              )}
            </div>
            {enrichedMovie?.genres && enrichedMovie.genres.length > 0 && (
              <div className="hero-genres" style={{ marginBottom: 'var(--space-3)' }}>
                {enrichedMovie.genres.slice(0, 4).map((g) => (
                  <span key={g} className="badge badge-muted">{g}</span>
                ))}
              </div>
            )}
            {enrichedMovie?.overview && (
              <p className="hero-overview">{enrichedMovie.overview}</p>
            )}
          </div>
        </div>
      </div>

      <div className="page-container">
        {/* This show's details */}
        <section className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
            Show Details
          </h2>
          <div className="show-meta" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
            <div>
              <dt>Theatre</dt>
              <dd>{show.theatre_name}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{show.city}</dd>
            </div>
            <div>
              <dt>Screen</dt>
              <dd>{show.screen_name}</dd>
            </div>
            <div>
              <dt>Starts at</dt>
              <dd>{formatDateTime(show.starts_at)}</dd>
            </div>
            <div>
              <dt>Price</dt>
              <dd style={{ color: 'var(--color-accent)' }}>{formatCents(show.price_cents)}</dd>
            </div>
          </div>
          <div style={{ marginTop: 'var(--space-5)' }}>
            <Link to={`/shows/${show.id}/seats`} className="btn btn-primary btn-lg">
              Choose Seats
            </Link>
          </div>
        </section>

        {/* Other showtimes for this movie */}
        {relatedShows.length > 0 && (
          <section className="shows-section">
            <div className="section-header">
              <h2>Other Showtimes</h2>
            </div>
            <div className="show-time-grid">
              {relatedShows.map((s) => (
                <Link
                  key={s.id}
                  to={`/shows/${s.id}`}
                  className="show-time-btn"
                >
                  <span>{formatDateTime(s.starts_at)}</span>
                  <span className="show-time-price">
                    {s.theatre_name} · {formatCents(s.price_cents)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}