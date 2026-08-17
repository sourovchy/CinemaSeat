import { useState, useCallback, useRef, useEffect } from 'react';
import { Link, NavLink, Route, Routes, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { BrowseMoviesPage } from './pages/BrowseMoviesPage';
import { BrowseTheatresPage } from './pages/BrowseTheatresPage';
import { BrowseShowsPage } from './pages/BrowseShowsPage';
import { ShowDetailsPage } from './pages/ShowDetailsPage';
import { SeatMapPage } from './pages/SeatMapPage';
import { PaymentPage } from './pages/PaymentPage';
import {
  ConfirmedPage,
  FailedPage,
  ExpiredPage,
  NotFoundPage,
} from './pages/TerminalPages';
import { CinemaSeatLogo } from './components/ui/CinemaSeatLogo';

// Inline SVG icons
const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  const query = searchParams.get('q') || '';

  // Expand search automatically if query exists on load
  useEffect(() => {
    if (query) {
      setSearchExpanded(true);
    }
  }, [query]);

  // Collapse on Escape key if empty
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && searchExpanded && !query) {
        setSearchExpanded(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchExpanded, query]);

  const handleSearchIconClick = () => {
    if (!searchExpanded) {
      setSearchExpanded(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      searchInputRef.current?.focus();
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (location.pathname !== '/') {
      navigate(`/?q=${encodeURIComponent(val)}`);
    } else {
      setSearchParams(val ? { q: val } : {});
    }
  };

  const handleClear = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('q');
    if (location.pathname === '/') {
      setSearchParams(params);
    } else {
      navigate(`/?${params.toString()}`);
    }
    setSearchExpanded(false);
  };

  const handleBlur = () => {
    if (!query) {
      setSearchExpanded(false);
    }
  };

  return (
    <div className="app-shell">
      {/* Navigation */}
      <header className="app-header">
        <div className="header-inner">
          <Link to="/" className="brand" onClick={closeMobileMenu}>
            <CinemaSeatLogo size={28} />
            <span>CinemaSeat</span>
          </Link>

          <nav className="nav-center" aria-label="Main navigation">
            <NavLink to="/" end>Movies</NavLink>
            <NavLink to="/theatres">Theatres</NavLink>
          </nav>

          <div className="nav-right">
            {/* Expandable Search */}
            <div className={`nav-search-wrapper ${searchExpanded ? 'expanded' : ''}`}>
              <input
                ref={searchInputRef}
                type="text"
                className="nav-search-input"
                placeholder="Search movies..."
                value={query}
                onChange={handleSearchChange}
                onBlur={handleBlur}
                aria-label="Search movies"
              />
              {searchExpanded ? (
                <button
                  type="button"
                  className="nav-search-clear-btn"
                  onClick={handleClear}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              ) : (
                <button
                  type="button"
                  className="nav-search-btn"
                  onClick={handleSearchIconClick}
                  aria-label="Search"
                >
                  <SearchIcon />
                </button>
              )}
            </div>

            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <div
        className={`mobile-nav-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={closeMobileMenu}
        aria-hidden={!mobileMenuOpen}
      >
        <nav
          className="mobile-nav-panel"
          onClick={(e) => e.stopPropagation()}
          aria-label="Mobile navigation"
        >
          <button
            type="button"
            className="mobile-nav-close"
            onClick={closeMobileMenu}
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
          <div className="mobile-nav-links">
            <NavLink to="/" end onClick={closeMobileMenu}>Movies</NavLink>
            <NavLink to="/theatres" onClick={closeMobileMenu}>Theatres</NavLink>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<BrowseMoviesPage />} />
          <Route path="/theatres" element={<BrowseTheatresPage />} />
          <Route
            path="/theatres/:theatreId/shows"
            element={<BrowseShowsPage />}
          />
          <Route path="/movies/:movieId/shows" element={<BrowseShowsPage />} />
          <Route path="/shows/:showId" element={<ShowDetailsPage />} />
          <Route path="/shows/:showId/seats" element={<SeatMapPage />} />
          <Route path="/bookings/:ref/pay" element={<PaymentPage />} />
          <Route
            path="/bookings/:ref/confirmed"
            element={<ConfirmedPage />}
          />
          <Route path="/bookings/:ref/failed" element={<FailedPage />} />
          <Route path="/bookings/:ref/expired" element={<ExpiredPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)' }}>
              <CinemaSeatLogo size={24} />
              <h3 style={{ margin: 0 }}>CinemaSeat</h3>
            </div>
            <p>Your premium cinema ticket booking experience. Browse movies, pick your seats, and book instantly.</p>
          </div>
          <div className="footer-links">
            <div className="footer-links-group">
              <h4>Explore</h4>
              <Link to="/">Movies</Link>
              <Link to="/theatres">Theatres</Link>
            </div>
            <div className="footer-links-group">
              <h4>Project</h4>
              <a
                href="https://github.com/sourovchy/CinemaSeat"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <small>&copy; {new Date().getFullYear()} CinemaSeat. All rights reserved.</small>
        </div>
      </footer>
    </div>
  );
}