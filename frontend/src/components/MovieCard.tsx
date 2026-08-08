import { Link } from 'react-router-dom';
import type { Movie } from '../types/api';

interface MovieCardProps {
  movie: Movie;
}

export function MovieCard({ movie }: MovieCardProps) {
  return (
    <article className="card movie-card">
      <header>
        <h3>{movie.title}</h3>
        <span className="badge">{movie.rating}</span>
      </header>
      <p className="meta">
        {movie.duration_min} min
      </p>
      <p className="description">{movie.description}</p>
      <Link
        to={`/movies/${movie.id}/shows`}
        className="btn btn-primary"
        aria-label={`See shows for ${movie.title}`}
      >
        See shows
      </Link>
    </article>
  );
}