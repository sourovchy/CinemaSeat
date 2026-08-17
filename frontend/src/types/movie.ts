// CinemaSeat's enriched movie model — normalized from TMDB + backend data.
// UI components depend on this model, never directly on TMDB response shapes.

export interface CinemaMovie {
  /** Backend movie ID — authoritative for bookings. */
  id: number;
  title: string;
  duration_min: number;
  /** Backend MPAA-style rating string (e.g. "PG-13"). */
  rating: string;
  description: string;

  // Enrichment from TMDB (all optional — graceful fallback when missing)
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string | null;
  releaseDate: string | null;
  releaseYear: number | null;
  tmdbRating: number | null;
  voteCount: number | null;
  genres: string[];
  language: string | null;
  tmdbId: number | null;
  director?: string | null;
  cast?: string[] | null;
  ageClassification?: string | null;
  format?: string | null;
}

// --- Raw TMDB response types (internal to the service layer) ---

export interface TMDBSearchResult {
  page: number;
  results: TMDBMovieResult[];
  total_results: number;
  total_pages: number;
}

export interface TMDBMovieResult {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  original_language: string;
  popularity: number;
  adult: boolean;
}

export interface TMDBMovieDetails {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
  genres: { id: number; name: string }[];
  original_language: string;
  status: string;
  tagline: string;
  budget: number;
  revenue: number;
}

export interface TMDBCredits {
  id: number;
  cast: TMDBCastMember[];
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}
