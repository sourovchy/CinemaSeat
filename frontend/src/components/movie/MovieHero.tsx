import { useEffect, useState, useRef } from 'react';
import type { CinemaMovie } from '../../types/movie';
import { formatReleaseDate } from '../../services/movieEnrichment';

const StarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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

const FilmIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="2.18" />
    <line x1="7" y1="2" x2="7" y2="22" />
    <line x1="17" y1="2" x2="17" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
  </svg>
);

interface MovieHeroProps {
  movies: CinemaMovie[];
  onBookTickets: (movie: CinemaMovie) => void;
  onViewDetails: (movie: CinemaMovie) => void;
}

export function MovieHero({ movies, onBookTickets, onViewDetails }: MovieHeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const isHoveredRef = useRef(false);

  // Auto-rotate hero every 6 seconds if not hovered
  useEffect(() => {
    if (movies.length <= 1) return;
    const interval = setInterval(() => {
      if (!isHoveredRef.current) {
        setCurrentIndex((prev) => (prev + 1) % movies.length);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [movies.length]);

  // Preload next backdrop image
  useEffect(() => {
    if (movies.length <= 1) return;
    const nextIdx = (currentIndex + 1) % movies.length;
    const nextUrl = movies[nextIdx]?.backdropUrl;
    if (nextUrl) {
      const img = new Image();
      img.src = nextUrl;
    }
  }, [currentIndex, movies]);

  const activeMovie = movies[currentIndex] || movies[0];
  if (!activeMovie) return null;

  const formattedDate = formatReleaseDate(activeMovie.releaseDate);

  return (
    <section
      className="movie-hero"
      aria-label={`Featured: ${activeMovie.title}`}
      onMouseEnter={() => { isHoveredRef.current = true; }}
      onMouseLeave={() => { isHoveredRef.current = false; }}
    >
      <div className="hero-backdrop">
        {activeMovie.backdropUrl ? (
          <img
            key={activeMovie.backdropUrl}
            src={activeMovie.backdropUrl}
            alt=""
            loading="eager"
            {...{ fetchpriority: 'high' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--color-bg-elevated)' }} />
        )}
      </div>

      <div className="hero-content">
        <div className="hero-poster">
          {activeMovie.posterUrl ? (
            <img
              key={activeMovie.posterUrl}
              src={activeMovie.posterUrl}
              alt={`${activeMovie.title} poster`}
              loading="eager"
            />
          ) : (
            <div className="poster-fallback" style={{ aspectRatio: '2/3' }}>
              <FilmIcon />
              <span>{activeMovie.title}</span>
            </div>
          )}
        </div>

        <div className="hero-info">
          <div className="hero-meta">
            <span className="badge badge-accent">{activeMovie.rating}</span>
            {formattedDate && (
              <>
                <span className="meta-dot" />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-accent)', fontWeight: 600 }}>
                  <CalendarIcon /> {formattedDate}
                </span>
              </>
            )}
            {activeMovie.tmdbRating != null && (
              <>
                <span className="meta-dot" />
                <span className="poster-card-rating">
                  <StarIcon /> {activeMovie.tmdbRating.toFixed(1)}
                </span>
              </>
            )}
            {activeMovie.duration_min > 0 && (
              <>
                <span className="meta-dot" />
                <span>{activeMovie.duration_min} min</span>
              </>
            )}
          </div>

          <h1 className="hero-title">{activeMovie.title}</h1>

          {activeMovie.genres.length > 0 && (
            <div className="hero-genres">
              {activeMovie.genres.slice(0, 4).map((g) => (
                <span key={g} className="badge badge-muted">{g}</span>
              ))}
            </div>
          )}

          <p className="hero-overview">
            {activeMovie.overview || activeMovie.description}
          </p>

          <div className="hero-actions">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => onBookTickets(activeMovie)}
            >
              Book Tickets
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-lg"
              onClick={() => onViewDetails(activeMovie)}
            >
              View Details
            </button>
          </div>

          {/* Hero rotation indicators */}
          {movies.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 24 }} aria-label="Featured movies carousel">
              {movies.map((m, idx) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`View ${m.title}`}
                  aria-current={idx === currentIndex ? 'true' : 'false'}
                  style={{
                    width: idx === currentIndex ? 28 : 8,
                    height: 8,
                    borderRadius: 4,
                    border: 'none',
                    background: idx === currentIndex ? 'var(--color-accent)' : 'rgba(255,255,255,0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    padding: 0,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
