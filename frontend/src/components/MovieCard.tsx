import { Link } from 'react-router-dom';
import type { Movie } from '../types/api';

interface MovieCardProps {
  movie: Movie;
}

/**
 * Simple text-only movie card — kept for backward compatibility.
 * The homepage now uses MoviePosterCard with TMDB enrichment.
 */
export function MovieCard({ movie }: MovieCardProps) {
  return (
    <article className="show-card">
      <h3>{movie.title}</h3>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 'var(--space-2)' }}>
        <span className="badge badge-accent">{movie.rating}</span>
        <span className="meta">{movie.duration_min} min</span>
      </div>
      <p className="description">{movie.description}</p>
      <Link
        to={`/movies/${movie.id}/shows`}
        className="btn btn-primary"
        aria-label={`See shows for ${movie.title}`}
      >
        See Shows
      </Link>
    </article>
  );
}