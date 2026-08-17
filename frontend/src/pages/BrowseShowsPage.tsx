import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { moviesApi, showsApi, theatresApi } from '../api/catalog';
import { useAsync } from '../hooks/useAsync';
import { ErrorState } from '../components/States';
import { HeroSkeleton } from '../components/ui/Skeleton';
import { enrichMovie, getEnrichedMovie, formatReleaseDate } from '../services/movieEnrichment';
import type { CinemaMovie } from '../types/movie';
import type { Show } from '../types/api';

function cleanScreenName(name: string): string {
  const lowercase = name.toLowerCase();
  
  if (lowercase.includes('screen a') || lowercase.endsWith(' a')) {
    return 'Hall 1';
  }
  if (lowercase.includes('screen b') || lowercase.endsWith(' b')) {
    return 'Hall 2';
  }
  if (lowercase.includes('screen c') || lowercase.endsWith(' c')) {
    return 'Hall 3';
  }
  if (lowercase.includes('screen d') || lowercase.endsWith(' d')) {
    return 'Hall 4';
  }

  if (lowercase.includes('1') || lowercase.includes('standard') || lowercase.includes('compact')) {
    return 'Hall 1';
  }
  if (lowercase.includes('2') || lowercase.includes('premium')) {
    return 'Hall 2';
  }
  if (lowercase.includes('3') || lowercase.includes('wide') || lowercase.includes('large')) {
    return 'Hall 3';
  }
  if (lowercase.includes('4')) {
    return 'Hall 4';
  }

  return name.replace(/Screen/gi, 'Hall');
}

const MapPinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);





const InfoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

function formatYmd(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}



interface ShowtimeDateSelectorProps {
  selectedDateStr: string;
  onSelectDate: (dateStr: string) => void;
  minDateStr: string;
}

function getCalendarBtnLabel(ymd: string) {
  const [yyyy, mm, dd] = ymd.split('-').map(Number);
  const dateObj = new Date(yyyy, mm - 1, dd);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${dateObj.getDate()} ${months[dateObj.getMonth()]}`;
}

function ShowtimeDateSelector({
  selectedDateStr,
  onSelectDate,
  minDateStr,
}: ShowtimeDateSelectorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const quickDates = useMemo(() => {
    const dates = [];
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const [todayYear, todayMonth, todayDay] = minDateStr.split('-').map(Number);
    const today = new Date(todayYear, todayMonth - 1, todayDay);

    for (let i = 0; i < 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const ymd = formatYmd(d);

      dates.push({
        dateStr: ymd,
        dayLabel: i === 0 ? 'Today' : (i === 1 ? 'Tomorrow' : weekday[d.getDay()]),
        dateLabel: `${d.getDate()} ${month[d.getMonth()]}`,
      });
    }
    return dates;
  }, [minDateStr]);

  const maxQuickDate = quickDates[2]?.dateStr || '';
  const isOutsideWindow = selectedDateStr > maxQuickDate;

  const handleCalendarClick = () => {
    if (inputRef.current) {
      try {
        inputRef.current.showPicker();
      } catch (e) {
        inputRef.current.click();
      }
    }
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      if (val < minDateStr) {
        onSelectDate(minDateStr);
      } else {
        onSelectDate(val);
      }
    }
  };

  return (
    <div className="showtime-date-selector">
      <div className="quick-date-cards" role="tablist">
        {quickDates.map((opt) => {
          const isActive = selectedDateStr === opt.dateStr;
          return (
            <button
              key={opt.dateStr}
              type="button"
              className={`date-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectDate(opt.dateStr)}
              role="tab"
              aria-selected={isActive}
              tabIndex={0}
            >
              <span className="date-tab-day">{opt.dayLabel}</span>
              <span className="date-tab-date">{opt.dateLabel}</span>
            </button>
          );
        })}

        <div className="calendar-card-wrapper">
          <button
            type="button"
            className={`date-tab-btn date-calendar-btn ${isOutsideWindow ? 'active' : ''}`}
            onClick={handleCalendarClick}
            tabIndex={-1}
            aria-hidden="true"
          >
            <span className="date-tab-day">Select Date</span>
            <span className="date-tab-date">{getCalendarBtnLabel(selectedDateStr)} 📅</span>
          </button>
          <input
            type="date"
            ref={inputRef}
            className="hidden-date-input"
            value={selectedDateStr}
            min={minDateStr}
            onChange={handleDateInputChange}
            onClick={(e) => {
              try {
                e.currentTarget.showPicker();
              } catch (err) {
                // fallback
              }
            }}
            title="Choose date"
            aria-label="Choose date"
          />
        </div>
      </div>
    </div>
  );
}

export function BrowseShowsPage() {
  const { movieId, theatreId } = useParams<{ movieId?: string; theatreId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const shouldBookDirectly = queryParams.get('book') === 'true';

  const bookingSectionRef = useRef<HTMLDivElement>(null);

  const isMovieScope = Boolean(movieId);
  const isTheatreScope = Boolean(theatreId);

  const shows = useAsync(() => showsApi.list().then((r) => r.shows), []);
  const movies = useAsync(() => moviesApi.list().then((r) => r.movies), []);
  const theatres = useAsync(() => theatresApi.list().then((r) => r.theatres), []);

  // Selected state for Wizard
  const [selectedTheatreId, setSelectedTheatreId] = useState<number | null>(null);
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => formatYmd(new Date()));

  // Set initial selections based on route scopes
  useEffect(() => {
    if (isTheatreScope && theatreId) {
      setSelectedTheatreId(Number(theatreId));
    }
    if (isMovieScope && movieId) {
      setSelectedMovieId(Number(movieId));
    }
  }, [isMovieScope, isTheatreScope, movieId, theatreId]);

  // Scroll to booking section if book=true is present
  useEffect(() => {
    if (shouldBookDirectly && bookingSectionRef.current) {
      setTimeout(() => {
        if (typeof bookingSectionRef.current?.scrollIntoView === 'function') {
          bookingSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }
  }, [shouldBookDirectly, shows.loading, movies.loading, theatres.loading]);

  // Enrich the scoped movie if browsing by movie
  const [enrichedMovie, setEnrichedMovie] = useState<CinemaMovie | null>(null);
  useEffect(() => {
    if (!isMovieScope || !movieId || !movies.data) return;
    const mid = Number(movieId);
    const movie = movies.data.find((m) => m.id === mid);
    if (!movie) return;

    const cached = getEnrichedMovie(mid);
    if (cached) {
      setEnrichedMovie(cached);
      return;
    }

    let cancelled = false;
    enrichMovie(movie).then((result) => {
      if (!cancelled) setEnrichedMovie(result);
    });
    return () => { cancelled = true; };
  }, [isMovieScope, movieId, movies.data]);

  // Filter shows by active scope (Movie or Theatre)
  const scopedShows = useMemo(() => {
    if (!shows.data) return [];
    if (isMovieScope && movieId) {
      return shows.data.filter((s) => s.movie_id === Number(movieId));
    }
    if (isTheatreScope && theatreId) {
      return shows.data.filter((s) => s.theatre_id === Number(theatreId));
    }
    return shows.data;
  }, [shows.data, isMovieScope, isTheatreScope, movieId, theatreId]);

  // Get list of theatres hosting this movie (for Movie Scope selection cards)
  const availableTheatres = useMemo(() => {
    if (!theatres.data || !scopedShows.length) return [];
    const tIds = new Set(scopedShows.map((s) => s.theatre_id));
    return theatres.data.filter((t) => tIds.has(t.id));
  }, [theatres.data, scopedShows]);

  // Get list of movies playing in this theatre (for Theatre Scope selection cards)
  const availableMovies = useMemo(() => {
    if (!movies.data || !scopedShows.length) return [];
    const mIds = new Set(scopedShows.map((s) => s.movie_id));
    return movies.data.filter((m) => mIds.has(m.id));
  }, [movies.data, scopedShows]);

  // Normalization safety hook
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayYmd = formatYmd(today);
    if (selectedDateStr < todayYmd) {
      setSelectedDateStr(todayYmd);
    }
  }, [selectedDateStr]);

  // Generate three quick-select dates starting today
  const quickDates = useMemo(() => {
    const dates = [];
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const ymd = formatYmd(d);

      dates.push({
        dateStr: ymd,
        dayLabel: i === 0 ? 'Today' : (i === 1 ? 'Tomorrow' : weekday[d.getDay()]),
        dateLabel: `${d.getDate()} ${month[d.getMonth()]}`,
      });
    }
    return dates;
  }, []);

  const minDateStr = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return formatYmd(today);
  }, []);

  const isOutsideThreeDayWindow = useMemo(() => {
    if (!selectedDateStr) return false;
    const maxQuickDate = quickDates[2]?.dateStr || '';
    return selectedDateStr > maxQuickDate;
  }, [selectedDateStr, quickDates]);

  // Filter available shows by selected criteria
  const finalFilteredShows = useMemo(() => {
    if (!selectedDateStr || isOutsideThreeDayWindow) return [];

    return scopedShows.filter((s) => {
      const showDateStr = formatYmd(new Date(s.starts_at));
      const dateMatches = showDateStr === selectedDateStr;

      if (isMovieScope) {
        return dateMatches && s.theatre_id === selectedTheatreId;
      } else {
        return dateMatches && s.movie_id === selectedMovieId;
      }
    });
  }, [scopedShows, selectedTheatreId, selectedMovieId, selectedDateStr, isMovieScope, isOutsideThreeDayWindow]);

  // Group shows by screen name (hall)
  const showsByHall = useMemo(() => {
    const groups = new Map<string, Show[]>();
    finalFilteredShows.forEach((s) => {
      const hallName = cleanScreenName(s.screen_name);
      const list = groups.get(hallName) ?? [];
      list.push(s);
      groups.set(hallName, list);
    });
    
    // Sort halls by name
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [finalFilteredShows]);

  // Default to first available theatre if none selected
  useEffect(() => {
    if (isMovieScope && availableTheatres.length > 0 && selectedTheatreId === null) {
      setSelectedTheatreId(availableTheatres[0].id);
    }
  }, [isMovieScope, availableTheatres, selectedTheatreId]);

  if (shows.loading || movies.loading || theatres.loading) {
    return <HeroSkeleton />;
  }

  if (shows.error || movies.error || theatres.error) {
    const err = shows.error || movies.error || theatres.error;
    return (
      <div className="page-container">
        <ErrorState
          message={err?.message || 'Failed to load booking schedule.'}
          onRetry={() => {
            shows.reload();
            movies.reload();
            theatres.reload();
          }}
        />
      </div>
    );
  }

  const selectedTheatre = theatres.data?.find((t) => t.id === selectedTheatreId);

  // 1. MOVIE SCOPE - BOOK DIRECTLY MODE
  if (isMovieScope && enrichedMovie && shouldBookDirectly) {
    return (
      <div className="browse-shows-layout">
        {/* Compact header for context */}
        <div className="booking-compact-header">
          <div className="booking-compact-header-inner">
            {enrichedMovie.posterUrl && (
              <img src={enrichedMovie.posterUrl} alt="" className="booking-compact-poster" />
            )}
            <div className="booking-compact-info">
              <span className="booking-compact-label">Booking Tickets for</span>
              <h1 className="booking-compact-title">{enrichedMovie.title}</h1>
              <div className="booking-compact-meta">
                <span className="badge badge-accent" style={{ padding: '2px 6px', fontSize: '10px' }}>
                  {enrichedMovie.ageClassification || enrichedMovie.rating}
                </span>
                <span className="meta-dot" />
                <span>{enrichedMovie.duration_min} min</span>
                {enrichedMovie.format && (
                  <>
                    <span className="meta-dot" />
                    <span>{enrichedMovie.format}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Unified Selection UIs */}
        <div className="page-container showtimes-container" ref={bookingSectionRef}>
          {availableTheatres.length === 0 ? (
            <p className="hint">No theatres are currently screening this movie.</p>
          ) : (
            <>
              {/* Theatre Selector */}
              <div className="theatre-selector-wrapper">
                <span className="selector-label">THEATRES</span>
                <div className="theatre-select-tabs">
                  {availableTheatres.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`theatre-tab-btn ${selectedTheatreId === t.id ? 'active' : ''}`}
                      onClick={() => setSelectedTheatreId(t.id)}
                    >
                      <span className="theatre-tab-name">{t.name}</span>
                      <span className="theatre-tab-city">{t.city}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theatre Address Meta */}
              {selectedTheatre && (
                <div className="selected-theatre-address-meta">
                  <MapPinIcon />
                  <span>{selectedTheatre.address || selectedTheatre.city}</span>
                </div>
              )}

              {/* Date Selector */}
              <ShowtimeDateSelector
                selectedDateStr={selectedDateStr}
                onSelectDate={setSelectedDateStr}
                minDateStr={minDateStr}
              />

              {/* Showtimes List Grouped by Hall */}
              <div className="shows-list-wrapper">
                {isOutsideThreeDayWindow ? (
                  <div className="state state-empty">
                    <strong>Showtimes Not Available</strong>
                    <p>Showtimes are currently available only for the next three days. Please select another date.</p>
                  </div>
                ) : showsByHall.length === 0 ? (
                  <div className="state state-empty">
                    <InfoIcon />
                    <strong>No showtimes available.</strong>
                    <p>There are no scheduled shows for this movie at this location on the selected date. Please pick another date.</p>
                  </div>
                ) : (
                  <div className="hall-showtimes-grid">
                    {showsByHall.map(([hallName, hallShows]) => (
                      <div key={hallName} className="hall-showtime-row">
                        <div className="hall-info-col">
                          <h4>{hallName}</h4>
                        </div>
                        <div className="showtime-buttons-col">
                          {hallShows
                            .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                            .map((s) => (
                              <Link
                                key={s.id}
                                to={`/shows/${s.id}/seats`}
                                className="showtime-booking-btn"
                              >
                                <span className="st-time">
                                  {new Date(s.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </span>
                                <span className="st-price">
                                  ৳{(s.price_cents / 100).toFixed(0)}
                                </span>
                              </Link>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="back-btn-container">
            <Link to="/" className="btn btn-secondary">
              ← Back to Movies
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. MOVIE SCOPE - VIEW DETAILS MODE (Information-First)
  if (isMovieScope && enrichedMovie && !shouldBookDirectly) {
    return (
      <div className="browse-shows-layout">
        {/* Full Cinematic Movie Details Hero */}
        <section className="detail-hero" aria-label={`${enrichedMovie.title} Details`}>
          <div className="hero-backdrop">
            {enrichedMovie.backdropUrl ? (
              <img src={enrichedMovie.backdropUrl} alt="" loading="eager" />
            ) : (
              <div className="hero-backdrop-placeholder" />
            )}
          </div>
          <div className="detail-hero-content">
            {enrichedMovie.posterUrl && (
              <div className="detail-poster">
                <img src={enrichedMovie.posterUrl} alt={`${enrichedMovie.title} poster`} />
              </div>
            )}
            <div className="detail-info">
              <h1>{enrichedMovie.title}</h1>
              <div className="hero-meta">
                <span className="badge badge-accent">{enrichedMovie.ageClassification || enrichedMovie.rating}</span>
                <span className="meta-dot" />
                <span>{enrichedMovie.duration_min} min</span>
                <span className="meta-dot" />
                <span>{enrichedMovie.genres.join(' · ')}</span>
                {enrichedMovie.format && (
                  <>
                    <span className="meta-dot" />
                    <span className="format-highlight">{enrichedMovie.format}</span>
                  </>
                )}
              </div>
              <p className="hero-overview">
                {enrichedMovie.overview}
              </p>
              <div className="movie-credits">
                <strong>Director</strong> <span>{enrichedMovie.director || 'N/A'}</span>
                <strong>Cast</strong> <span>{enrichedMovie.cast?.join(', ') || 'N/A'}</span>
                <strong>Language</strong> <span>{enrichedMovie.language || 'English'}</span>
                <strong>Release</strong> <span>{formatReleaseDate(enrichedMovie.releaseDate)}</span>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-lg book-tickets-cta"
                onClick={() => navigate('?book=true')}
              >
                BOOK TICKETS
              </button>
            </div>
          </div>
        </section>

        {/* Simplified Showtimes Section */}
        <div className="page-container showtimes-container">
          <hr className="section-divider" />
          
          <div className="showtimes-section-header">
            <h2>SHOWTIMES</h2>
            <p>Choose a theatre and showtime</p>
          </div>
          
          {availableTheatres.length === 0 ? (
            <p className="hint">No theatres are currently screening this movie.</p>
          ) : (
            <>
              {/* Theatre Selector */}
              <div className="theatre-selector-wrapper">
                <span className="selector-label">THEATRES</span>
                <div className="theatre-select-tabs">
                  {availableTheatres.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`theatre-tab-btn ${selectedTheatreId === t.id ? 'active' : ''}`}
                      onClick={() => setSelectedTheatreId(t.id)}
                    >
                      <span className="theatre-tab-name">{t.name}</span>
                      <span className="theatre-tab-city">{t.city}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theatre Address Meta */}
              {selectedTheatre && (
                <div className="selected-theatre-address-meta">
                  <MapPinIcon />
                  <span>{selectedTheatre.address || selectedTheatre.city}</span>
                </div>
              )}

              {/* Date Selector */}
              <ShowtimeDateSelector
                selectedDateStr={selectedDateStr}
                onSelectDate={setSelectedDateStr}
                minDateStr={minDateStr}
              />

              {/* Showtimes List Grouped by Hall */}
              <div className="shows-list-wrapper">
                {isOutsideThreeDayWindow ? (
                  <div className="state state-empty">
                    <strong>Showtimes Not Available</strong>
                    <p>Showtimes are currently available only for the next three days. Please select another date.</p>
                  </div>
                ) : showsByHall.length === 0 ? (
                  <div className="state state-empty">
                    <InfoIcon />
                    <strong>No showtimes available.</strong>
                    <p>There are no scheduled shows for this movie at this location on the selected date. Please pick another date.</p>
                  </div>
                ) : (
                  <div className="hall-showtimes-grid">
                    {showsByHall.map(([hallName, hallShows]) => (
                      <div key={hallName} className="hall-showtime-row">
                        <div className="hall-info-col">
                          <h4>{hallName}</h4>
                        </div>
                        <div className="showtime-buttons-col">
                          {hallShows
                            .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                            .map((s) => (
                              <Link
                                key={s.id}
                                to={`/shows/${s.id}/seats`}
                                className="showtime-booking-btn"
                              >
                                <span className="st-time">
                                  {new Date(s.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </span>
                                <span className="st-price">
                                  ৳{(s.price_cents / 100).toFixed(0)}
                                </span>
                              </Link>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="back-btn-container">
            <Link to="/" className="btn btn-secondary">
              ← Back to Movies
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. THEATRE SCOPE - STANDARD LAYOUT
  return (
    <div className="browse-shows-layout">
      {isTheatreScope && selectedTheatre && (
        <section className="detail-hero" style={{ minHeight: '260px' }} aria-label={`${selectedTheatre.name} Details`}>
          <div className="hero-backdrop">
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #100b26 0%, #030408 100%)' }} />
          </div>
          <div className="detail-hero-content">
            <div className="detail-info">
              <h1>{selectedTheatre.name}</h1>
              <p style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPinIcon />
                {selectedTheatre.address || selectedTheatre.city}
              </p>
              <span className="badge badge-muted" style={{ marginTop: 'var(--space-2)' }}>
                {selectedTheatre.halls_count || 3} Cinema Screens Available
              </span>
            </div>
          </div>
        </section>
      )}

      <div className="page-container" ref={bookingSectionRef}>
        <div className="booking-wizard-card">
          <div className="wizard-body">
            <section className="wizard-step-section">
              <h3>Select Movie</h3>
              {availableMovies.length === 0 ? (
                <p className="hint">No movies are currently playing at this theatre.</p>
              ) : (
                <div className="theatre-cards-list">
                  {availableMovies.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`theatre-select-card ${selectedMovieId === m.id ? 'selected' : ''}`}
                      onClick={() => setSelectedMovieId(m.id)}
                    >
                      <div className="t-card-header">
                        <h4>{m.title}</h4>
                      </div>
                      <div className="t-card-body">
                        <p>{m.duration_min} min · Rated {m.rating}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {selectedMovieId && (
              <section className="wizard-step-section" style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--space-6)', marginTop: 'var(--space-6)' }}>
                <h3>Select Date</h3>
                <ShowtimeDateSelector
                  selectedDateStr={selectedDateStr}
                  onSelectDate={setSelectedDateStr}
                  minDateStr={minDateStr}
                />
              </section>
            )}

            {selectedMovieId && (
              <section className="wizard-step-section" style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--space-6)', marginTop: 'var(--space-6)' }}>
                <h3>Available Showtimes</h3>
                {isOutsideThreeDayWindow ? (
                  <div className="state state-empty" style={{ margin: 'var(--space-4) 0' }}>
                    <strong>Showtimes Not Available</strong>
                    <p>Showtimes are currently available only for the next three days. Please select another date.</p>
                  </div>
                ) : showsByHall.length === 0 ? (
                  <div className="state state-empty" style={{ margin: 'var(--space-4) 0' }}>
                    <InfoIcon />
                    <strong>No showtimes available.</strong>
                    <p>There are no scheduled shows for this movie at this location on the selected date. Please pick another date.</p>
                  </div>
                ) : (
                  <div className="hall-showtimes-grid">
                    {showsByHall.map(([hallName, hallShows]) => (
                      <div key={hallName} className="hall-showtime-row">
                        <div className="hall-info-col">
                          <h4>{hallName}</h4>
                          <span className="hall-type-badge">
                            2D
                          </span>
                        </div>
                        <div className="showtime-buttons-col">
                          {hallShows
                            .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                            .map((s) => (
                              <Link
                                key={s.id}
                                to={`/shows/${s.id}/seats`}
                                className="showtime-booking-btn"
                              >
                                <span className="st-time">
                                  {new Date(s.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </span>
                                <span className="st-price">
                                  ৳{(s.price_cents / 100).toFixed(0)}
                                </span>
                              </Link>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>

        <div style={{ maxWidth: '800px', margin: 'var(--space-6) auto 0', display: 'flex', justifyContent: 'flex-start' }}>
          <Link to="/" className="btn btn-secondary">
            ← Back to Movies
          </Link>
        </div>
      </div>
    </div>
  );
}