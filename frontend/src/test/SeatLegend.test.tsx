import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SeatLegend } from '../components/SeatMap';

describe('SeatLegend', () => {
  it('renders counts for each status', () => {
    render(
      <SeatLegend
        counts={{ available: 5, held: 2, booked: 1, selected: 0 }}
      />,
    );
    expect(screen.getByText(/Available\s*\(5\)/)).toBeInTheDocument();
    expect(screen.getByText(/Held\s*\(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Booked\s*\(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Selected\s*\(0\)/)).toBeInTheDocument();
  });
});
