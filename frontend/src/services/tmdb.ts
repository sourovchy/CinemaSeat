/**
 * TMDB API Service — centralized, cacheable, with graceful fallback.
 *
 * Architecture notes:
 * - Uses `VITE_TMDB_API_KEY` (browser-exposed, not a secret).
 * - All requests are cached in-memory to avoid duplicate fetches.
 * - Designed so it can later be moved behind a Vercel server-side proxy
 *   by changing only this file (swap fetch URL to /api/tmdb/...).
 * - Components never import this directly — they use movieEnrichment.ts.
 *
 * TMDB API terms require attribution: displayed in the footer.
 */

import type { TMDBSearchResult, TMDBMovieDetails, TMDBCredits } from '../types/movie';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

function getApiKey(): string | null {
  try {
    return import.meta.env.VITE_TMDB_API_KEY || null;
  } catch {
    return null;
  }
}

// ---------- In-memory cache ----------
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, ts: Date.now() });
}

// ---------- Fetcher ----------
async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const cacheKey = `${path}?${JSON.stringify(params)}`;
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  try {
    const url = new URL(`${TMDB_BASE}${path}`);
    url.searchParams.set('api_key', apiKey);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as T;
    setCache(cacheKey, data);
    return data;
  } catch {
    // Network failure, rate limit, etc. — degrade gracefully.
    return null;
  }
}

// ---------- Public API ----------

export async function searchMovie(title: string, year?: number): Promise<TMDBSearchResult | null> {
  const params: Record<string, string> = {
    query: title,
    include_adult: 'false',
    language: 'en-US',
    page: '1',
  };
  if (year) {
    params.primary_release_year = year.toString();
  }
  return tmdbFetch<TMDBSearchResult>('/search/movie', params);
}

export async function getMovieDetails(tmdbId: number): Promise<TMDBMovieDetails | null> {
  return tmdbFetch<TMDBMovieDetails>(`/movie/${tmdbId}`, {
    language: 'en-US',
  });
}

export async function getMovieCredits(tmdbId: number): Promise<TMDBCredits | null> {
  return tmdbFetch<TMDBCredits>(`/movie/${tmdbId}/credits`, {
    language: 'en-US',
  });
}

// ---------- Image URL helpers ----------

/** Poster sizes: w92, w154, w185, w342, w500, w780, original */
export function posterUrl(path: string | null, size: string = 'w500'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/** Backdrop sizes: w300, w780, w1280, original */
export function backdropUrl(path: string | null, size: string = 'w1280'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/** Profile/cast photo sizes: w45, w185, h632, original */
export function profileUrl(path: string | null, size: string = 'w185'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/** Check if TMDB integration is available */
export function isTmdbAvailable(): boolean {
  return !!getApiKey();
}
