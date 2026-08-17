import { Link } from 'react-router-dom';
import type { CinemaMovie } from '../../types/movie';

const StarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
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

interface MoviePosterCardProps {
  movie: CinemaMovie;
}

export function MoviePosterCard({ movie }: MoviePosterCardProps) {

  return (
    <article className="poster-card">
      <Link
        to={`/movies/${movie.id}/shows`}
        className="poster-card-image-link"
        aria-label={`See details for ${movie.title}`}
      >
        <div className="poster-card-image">
          {movie.posterUrl ? (
            <img
              src={movie.posterUrl}
              alt={`${movie.title} poster`}
              loading="lazy"
            />
          ) : (
            <div className="poster-fallback">
              <FilmIcon />
              <span>{movie.title}</span>
            </div>
          )}
        </div>
      </Link>
      <div className="poster-card-body">
        <Link
          to={`/movies/${movie.id}/shows`}
          className="poster-card-title-link"
        >
          <h3 className="poster-card-title">
            {movie.title}
          </h3>
        </Link>
        <div className="poster-card-meta">
          {movie.duration_min > 0 && <span>{movie.duration_min} min</span>}
          {movie.duration_min > 0 && (movie.tmdbRating != null || movie.rating) && <span className="meta-dot" />}
          {movie.tmdbRating != null && (
            <span className="poster-card-rating" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <StarIcon /> {movie.tmdbRating.toFixed(1)}
            </span>
          )}
          {movie.tmdbRating != null && movie.rating && <span className="meta-dot" />}
          {movie.rating && <span className="badge badge-muted rating-badge">{movie.rating}</span>}
        </div>
        <div className="poster-card-spacer" />
        <div className="poster-card-actions">
          <Link
            to={`/movies/${movie.id}/shows`}
            className="btn btn-secondary btn-sm poster-card-btn-shows"
          >
            View Shows
          </Link>
        </div>
      </div>
    </article>
  );
}
