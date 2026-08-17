/**
 * Movie Enrichment Layer
 *
 * Maps backend Movie objects to enriched CinemaMovie by matching against TMDB.
 * The backend remains authoritative for movie identity/bookings.
 * TMDB is presentation-only enrichment.
 *
 * Default ordering: Release Date Ascending (March 2026 -> July 2026).
 */

import type { Movie } from '../types/api';
import type { CinemaMovie } from '../types/movie';
import { searchMovie, getMovieDetails, posterUrl, backdropUrl } from './tmdb';
import { getFallbackPoster, getFallbackBackdrop } from '../data/fallbackImages';

export interface MovieCanonicalInfo {
  title: string;
  releaseDate: string; // ISO format e.g. "2026-03-20"
  releaseYear: number; // 2026
  searchTitle: string;
  tmdbId?: number;
  genres: string[];
  director: string;
  cast: string[];
  language: string;
  format: string;
  ageClassification: string;
  synopsis: string;
}

/** Verified canonical 2026 release schedule for the CinemaSeat catalog. */
export const CANONICAL_CATALOG: Record<string, MovieCanonicalInfo> = {
  'project hail mary': {
    title: 'Project Hail Mary',
    releaseDate: '2026-03-20',
    releaseYear: 2026,
    searchTitle: 'Project Hail Mary',
    tmdbId: 558449,
    genres: ['Science Fiction', 'Adventure'],
    director: 'Phil Lord & Christopher Miller',
    cast: ['Ryan Gosling', 'Sandra Hüller'],
    language: 'English',
    format: '2D',
    ageClassification: 'PG-13',
    synopsis: 'Ryland Grace, a sole surviving astronaut, awakens with amnesia aboard an interstellar spacecraft and must use his scientific ingenuity to save humanity from a solar extinction threat.',
  },
  'michael': {
    title: 'Michael',
    releaseDate: '2026-04-24',
    releaseYear: 2026,
    searchTitle: 'Michael',
    tmdbId: 1022789,
    genres: ['Biographical', 'Musical Drama'],
    director: 'Antoine Fuqua',
    cast: ['Jaafar Jackson', 'Colman Domingo', 'Nia Long', 'Miles Teller', 'Laura Harrier'],
    language: 'English',
    format: '2D',
    ageClassification: 'R',
    synopsis: 'An epic biographical drama depicting the rise to fame, artistic genius, and personal struggles of the global icon Michael Jackson.',
  },
  'obsession': {
    title: 'Obsession',
    releaseDate: '2026-05-15',
    releaseYear: 2026,
    searchTitle: 'Obsession',
    tmdbId: 1214509,
    genres: ['Horror'],
    director: 'Curry Barker',
    cast: ['Michael Johnston', 'Inde Navarrette', 'Cooper Tomlinson', 'Megan Lawless', 'Andy Richter'],
    language: 'English',
    format: '2D',
    ageClassification: 'R',
    synopsis: 'After purchasing a supernatural novelty item, Bear makes a wish for his coworker Nikki to fall in love with him, leading to a dangerous and volatile obsession.',
  },
  'the odyssey': {
    title: 'The Odyssey',
    releaseDate: '2026-07-17',
    releaseYear: 2026,
    searchTitle: 'The Odyssey',
    tmdbId: 1128710,
    genres: ['Mythic Epic', 'Adventure'],
    director: 'Christopher Nolan',
    cast: ['Matt Damon', 'Tom Holland', 'Anne Hathaway', 'Robert Pattinson', 'Lupita Nyong\'o', 'Zendaya', 'Charlize Theron'],
    language: 'English',
    format: '2D',
    ageClassification: 'PG-13',
    synopsis: "Based on Homer's ancient Greek epic, the film follows Odysseus, King of Ithaca, on his perilous ten-year journey home after the fall of Troy.",
  },
  'spider-man: brand new day': {
    title: 'Spider-Man: Brand New Day',
    releaseDate: '2026-07-31',
    releaseYear: 2026,
    searchTitle: 'Spider-Man: Brand New Day',
    tmdbId: 1171640,
    genres: ['Action', 'Adventure'],
    director: 'Destin Daniel Cretton',
    cast: ['Tom Holland', 'Zendaya', 'Sadie Sink', 'Jacob Batalon', 'Jon Bernthal', 'Mark Ruffalo'],
    language: 'English',
    format: '2D',
    ageClassification: 'PG-13',
    synopsis: 'Set several years after No Way Home, Peter Parker operates as a full-time, street-level vigilante in a world that has forgotten his identity, facing a powerful new threat.',
  },
};

/** Format release date into standard human string (e.g., "Mar 20, 2026"). */
export function formatReleaseDate(isoDate: string | null): string {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return isoDate;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoDate;
  }
}

// Enrichment cache keyed by backend movie ID
const enrichmentCache = new Map<number, CinemaMovie>();

/**
 * Enrich a single backend Movie with TMDB metadata.
 * Matches 2026 canonical release date and official artwork.
 */
export async function enrichMovie(movie: Movie): Promise<CinemaMovie> {
  const cached = enrichmentCache.get(movie.id);
  if (cached) return cached;

  const key = movie.title.toLowerCase().trim();
  const canonical = CANONICAL_CATALOG[key];

  // Base movie model using canonical release data if known
  const base: CinemaMovie = {
    id: movie.id,
    title: movie.title,
    duration_min: movie.duration_min,
    rating: movie.rating,
    description: movie.description,
    posterUrl: getFallbackPoster(movie.title) || null,
    backdropUrl: getFallbackBackdrop(movie.title) || null,
    overview: canonical?.synopsis || movie.description,
    releaseDate: canonical?.releaseDate || null,
    releaseYear: canonical?.releaseYear || 2026,
    tmdbRating: null,
    voteCount: null,
    genres: canonical?.genres || [],
    language: canonical?.language || null,
    tmdbId: canonical?.tmdbId || null,
    director: canonical?.director || null,
    cast: canonical?.cast || [],
    ageClassification: canonical?.ageClassification || null,
    format: canonical?.format || '2D Digital',
  };

  try {
    // 1. Direct fetch if verified TMDB ID is available
    if (canonical?.tmdbId) {
      const details = await getMovieDetails(canonical.tmdbId);
      if (details) {
        const enriched: CinemaMovie = {
          ...base,
          posterUrl: posterUrl(details.poster_path, 'w500') || base.posterUrl,
          backdropUrl: backdropUrl(details.backdrop_path, 'w1280') || base.backdropUrl,
          overview: details.overview || base.overview,
          releaseDate: details.release_date || base.releaseDate,
          releaseYear: details.release_date
            ? parseInt(details.release_date.substring(0, 4), 10) || base.releaseYear
            : base.releaseYear,
          tmdbRating: details.vote_average || null,
          voteCount: details.vote_count || null,
          genres: details.genres?.map((g) => g.name) ?? base.genres,
          language: details.original_language || base.language,
          tmdbId: details.id,
          director: base.director,
          cast: base.cast,
          ageClassification: base.ageClassification,
          format: base.format,
        };
        enrichmentCache.set(movie.id, enriched);
        return enriched;
      }
    }

    // 2. Fallback to TMDB search with 2026 release year matching
    const searchTitle = canonical?.searchTitle || movie.title;
    const searchResult = await searchMovie(searchTitle, 2026);
    const tmdbMovie = searchResult?.results?.find(
      (r) => r.release_date && r.release_date.startsWith('2026')
    ) || searchResult?.results?.[0];

    if (!tmdbMovie) {
      enrichmentCache.set(movie.id, base);
      return base;
    }

    const details = await getMovieDetails(tmdbMovie.id);

    const enriched: CinemaMovie = {
      ...base,
      posterUrl: posterUrl(tmdbMovie.poster_path, 'w500') || base.posterUrl,
      backdropUrl: backdropUrl(tmdbMovie.backdrop_path, 'w1280') || base.backdropUrl,
      overview: tmdbMovie.overview || base.overview,
      releaseDate: tmdbMovie.release_date || base.releaseDate,
      releaseYear: tmdbMovie.release_date
        ? parseInt(tmdbMovie.release_date.substring(0, 4), 10) || base.releaseYear
        : base.releaseYear,
      tmdbRating: tmdbMovie.vote_average || null,
      voteCount: tmdbMovie.vote_count || null,
      genres: details?.genres?.map((g) => g.name) ?? base.genres,
      language: tmdbMovie.original_language || base.language,
      tmdbId: tmdbMovie.id,
      director: base.director,
      cast: base.cast,
      ageClassification: base.ageClassification,
      format: base.format,
    };

    enrichmentCache.set(movie.id, enriched);
    return enriched;
  } catch {
    enrichmentCache.set(movie.id, base);
    return base;
  }
}

/**
 * Enrich all movies and return them in RELEASE DATE DESCENDING order.
 */
export async function enrichMovies(movies: Movie[]): Promise<CinemaMovie[]> {
  const enrichedList = await Promise.all(movies.map(enrichMovie));
  return sortByReleaseDate(enrichedList);
}

/**
 * Sort movies by release date descending (latest release date first).
 */
export function sortByReleaseDate(movies: CinemaMovie[]): CinemaMovie[] {
  return [...movies].sort((a, b) => {
    const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
    const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
    return dateB - dateA;
  });
}

/**
 * Get a previously enriched movie by backend ID (sync, from cache).
 */
export function getEnrichedMovie(id: number): CinemaMovie | null {
  return enrichmentCache.get(id) ?? null;
}
