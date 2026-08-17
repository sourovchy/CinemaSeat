import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { moviesApi, showsApi } from '../api/catalog';
import { useAsync } from '../hooks/useAsync';
import { ErrorState, EmptyState } from '../components/States';
import { MovieHero } from '../components/movie/MovieHero';
import { MoviePosterCard } from '../components/movie/MoviePosterCard';
import { HeroSkeleton, MovieGridSkeleton } from '../components/ui/Skeleton';
import { enrichMovies } from '../services/movieEnrichment';
import type { CinemaMovie } from '../types/movie';

export function BrowseMoviesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';

  // Fetch backend movies
  const moviesState = useAsync(() => moviesApi.list().then((r) => r.movies), []);
  const showsState = useAsync(() => showsApi.list().then((r) => r.shows), []);

  // Enrich with TMDB data & sort chronologically by release date ascending
  const [enrichedMovies, setEnrichedMovies] = useState<CinemaMovie[]>([]);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    if (!moviesState.data || moviesState.data.length === 0) return;
    let cancelled = false;
    setEnriching(true);
    enrichMovies(moviesState.data).then((result) => {
      if (!cancelled) {
        setEnrichedMovies(result);
        setEnriching(false);
      }
    });
    return () => { cancelled = true; };
  }, [moviesState.data]);

  // Search filter across the 5 movies while preserving release date ordering
  const filteredMovies = useMemo(() => {
    if (!searchQuery.trim()) return enrichedMovies;
    const q = searchQuery.toLowerCase().trim();
    return enrichedMovies.filter((m) => {
      const matchMovie = m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.genres.some((g) => g.toLowerCase().includes(q));

      const matchTheatre = (showsState.data || []).some((s) =>
        s.movie_id === m.id && s.theatre_name.toLowerCase().includes(q)
      );

      return matchMovie || matchTheatre;
    });
  }, [enrichedMovies, searchQuery, showsState.data]);

  const handleBookTickets = useCallback((movie: CinemaMovie) => {
    navigate(`/movies/${movie.id}/shows?book=true`);
  }, [navigate]);

  const handleViewDetails = useCallback((movie: CinemaMovie) => {
    navigate(`/movies/${movie.id}/shows`);
  }, [navigate]);

  // Loading state
  if (moviesState.loading) {
    return (
      <>
        <HeroSkeleton />
        <div className="page-container">
          <div className="section-header">
            <h2>Now Showing</h2>
          </div>
          <MovieGridSkeleton count={5} />
        </div>
      </>
    );
  }

  // Error state
  if (moviesState.error) {
    return (
      <div className="page-container">
        <ErrorState
          message={moviesState.error.message}
          onRetry={moviesState.reload}
        />
      </div>
    );
  }

  // Empty state
  if (!moviesState.data || moviesState.data.length === 0) {
    return (
      <div className="page-container">
        <EmptyState
          title="No movies available"
          message="There are no movies showing at this time. Check back later for new releases."
        />
      </div>
    );
  }

  const isSearching = searchQuery.trim().length > 0;

  return (
    <>
      {/* Hero Carousel — auto-rotates through the 5 movies in release-date order */}
      {!isSearching && enrichedMovies.length > 0 && !enriching && (
        <MovieHero
          movies={enrichedMovies}
          onBookTickets={handleBookTickets}
          onViewDetails={handleViewDetails}
        />
      )}
      {!isSearching && enriching && <HeroSkeleton />}

      <div className="page-container">
        {isSearching && (
          <div style={{ marginBottom: 'var(--space-6)', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-md)' }}>
              Showing results for <strong>"{searchQuery}"</strong>
            </span>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                fontSize: 'var(--text-xs)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'background var(--transition-fast)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-surface)'; }}
            >
              Clear Search
            </button>
          </div>
        )}

        {/* Movies Section */}
        <section>
          <div className="section-header">
            <h2>{isSearching ? 'Search Results' : 'Now Showing'}</h2>
          </div>

          {enriching && <MovieGridSkeleton count={5} />}

          {!enriching && filteredMovies.length === 0 && isSearching && (
            <EmptyState
              title="No movies found"
              message={`No movies match "${searchQuery}". Try searching for Project Hail Mary, Michael, Obsession, Odyssey, or Spider-Man.`}
            />
          )}

          {!enriching && filteredMovies.length > 0 && (
            <div className="movie-grid">
              {filteredMovies.map((m) => (
                <MoviePosterCard movie={m} key={m.id} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}