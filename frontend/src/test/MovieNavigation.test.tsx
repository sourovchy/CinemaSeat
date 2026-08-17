import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';

// Mock the API catalog
vi.mock('../api/catalog', () => {
  return {
    moviesApi: {
      list: vi.fn().mockResolvedValue({
        movies: [
          {
            id: 1,
            title: 'Project Hail Mary',
            duration_min: 120,
            rating: 'PG-13',
            description: 'Sci-Fi description',
          },
        ],
      }),
    },
    theatresApi: {
      list: vi.fn().mockResolvedValue({
        theatres: [
          {
            id: 101,
            name: 'Sony Square, Mirpur',
            city: 'Dhaka',
            address: 'Mirpur Road',
            halls_count: 3,
          },
        ],
      }),
    },
    showsApi: {
      list: vi.fn().mockResolvedValue({
        shows: [
          {
            id: 1001,
            movie_id: 1,
            movie_title: 'Project Hail Mary',
            theatre_id: 101,
            theatre_name: 'Sony Square, Mirpur',
            city: 'Dhaka',
            screen_id: 1,
            screen_name: 'Hall 1',
            starts_at: new Date().toISOString(),
            price_cents: 35000,
          },
        ],
      }),
    },
  };
});

describe('Movie Navigation - Details vs Booking', () => {
  it('renders View Details mode by default (no book query)', async () => {
    render(
      <MemoryRouter initialEntries={['/movies/1/shows']}>
        <App />
      </MemoryRouter>
    );

    // Wait for the Book Tickets CTA button inside details to render, ensuring loading is complete
    const bookTicketsBtn = await screen.findByRole('button', { name: 'BOOK TICKETS' });
    expect(bookTicketsBtn).toBeInTheDocument();

    // Verify title heading is rendered in details view
    expect(screen.getByRole('heading', { name: 'Project Hail Mary' })).toBeInTheDocument();
 
    // We should NOT see the booking mode context header
    expect(screen.queryByText('Booking Tickets for')).not.toBeInTheDocument();
 
    // We should see "SHOWTIMES" section
    expect(screen.getByText('SHOWTIMES')).toBeInTheDocument();
    expect(screen.getByText('Sony Square, Mirpur')).toBeInTheDocument();
  });
 
  it('renders Book Tickets mode directly (with ?book=true query)', async () => {
    render(
      <MemoryRouter initialEntries={['/movies/1/shows?book=true']}>
        <App />
      </MemoryRouter>
    );
 
    // Wait for direct booking view to load
    const bookingLabel = await screen.findByText('Booking Tickets for');
    expect(bookingLabel).toBeInTheDocument();
    expect(screen.getByText('Project Hail Mary')).toBeInTheDocument();
 
    // We should see the theatre selector label
    expect(screen.getByText('THEATRES')).toBeInTheDocument();
 
    // We should NOT see the hero CTA BOOK TICKETS button (since it is booking mode only)
    expect(screen.queryByRole('button', { name: 'BOOK TICKETS' })).not.toBeInTheDocument();
  });
 
  it('transitions from View Details to Book Tickets when clicking the Book Tickets CTA', async () => {
    render(
      <MemoryRouter initialEntries={['/movies/1/shows']}>
        <App />
      </MemoryRouter>
    );
 
    // Wait for details page to render
    const detailCta = await screen.findByRole('button', { name: 'BOOK TICKETS' });
    expect(screen.queryByText('Booking Tickets for')).not.toBeInTheDocument();
 
    // Click the Book Tickets CTA button to trigger transition
    fireEvent.click(detailCta);
 
    // Now it should show the direct booking layout and header
    await waitFor(() => {
      expect(screen.getByText('Booking Tickets for')).toBeInTheDocument();
      expect(screen.getByText('THEATRES')).toBeInTheDocument();
    });
  });

  it('verifies navbar search clear button still works', async () => {
    render(
      <MemoryRouter initialEntries={['/?q=Project']}>
        <App />
      </MemoryRouter>
    );

    // Wait for initial load and enrichment to finish to avoid act() warnings
    await screen.findByText('Project Hail Mary');

    // Verify search input value is populated
    const searchInput = await screen.findByPlaceholderText('Search movies...') as HTMLInputElement;
    expect(searchInput.value).toBe('Project');

    // Click clear button
    const clearBtn = screen.getByLabelText('Clear search');
    fireEvent.click(clearBtn);

    // Verify search input is cleared
    expect(searchInput.value).toBe('');
  });
});
