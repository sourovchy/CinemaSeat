import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';

// Mock the API catalog
vi.mock('../api/catalog', () => {
  return {
    moviesApi: {
      list: vi.fn().mockResolvedValue({ movies: [] }),
    },
    showsApi: {
      list: vi.fn().mockResolvedValue({ shows: [] }),
    },
  };
});

describe('Navbar Search Clear Button', () => {
  it('clears query and updates URL when clear button is clicked', async () => {
    // Render the App component wrapped in MemoryRouter
    render(
      <MemoryRouter initialEntries={['/?q=Project']}>
        <App />
      </MemoryRouter>
    );

    // Wait for initial load to finish to avoid act() warnings
    await screen.findByText('No movies available');

    // The search input should be present and expanded because we have initial query q=Project
    const searchInput = screen.getByPlaceholderText('Search movies...') as HTMLInputElement;
    expect(searchInput).toBeInTheDocument();
    expect(searchInput.value).toBe('Project');

    // The clear button (✕) should be visible
    const clearBtn = screen.getByLabelText('Clear search');
    expect(clearBtn).toBeInTheDocument();

    // Click the clear button
    fireEvent.click(clearBtn);

    // Verify search input is cleared
    expect(searchInput.value).toBe('');
  });
});
