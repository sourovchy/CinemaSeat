import { Link, NavLink, Route, Routes } from 'react-router-dom';
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

export function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          🎬 CinemaSeat
        </Link>
        <nav className="app-nav">
          <NavLink to="/" end>
            Movies
          </NavLink>
          <NavLink to="/theatres">Theatres</NavLink>
        </nav>
      </header>

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

      <footer className="app-footer">
        <small>Read-only frontend for the SeatLock / CinemaSeat backend.</small>
      </footer>
    </div>
  );
}