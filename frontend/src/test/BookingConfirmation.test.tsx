import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BookingConfirmation } from '../components/BookingConfirmation';
import type { Booking, Show } from '../types/api';

const booking: Booking = {
  booking_ref: 'SL-ABC123',
  show_id: 1,
  customer_name: 'Alice',
  status: 'CONFIRMED',
  seat_ids: [11, 12, 13],
  amount_cents: 36000,
  hold_expires_at: '2026-01-01T00:10:00Z',
  otp_verified: true,
  payment: {
    attempt_ref: 'att-1',
    status: 'SUCCEEDED',
    gateway_payment_id: 'gw-1',
  },
  created_at: '2026-01-01T00:00:00Z',
};

const show: Show = {
  id: 1,
  movie_id: 7,
  movie_title: 'Interstellar',
  theatre_id: 2,
  theatre_name: 'Cineworld',
  city: 'Dhaka',
  screen_id: 5,
  screen_name: 'Screen 1',
  starts_at: '2026-01-01T18:00:00Z',
  price_cents: 12000,
};

describe('BookingConfirmation', () => {
  it('renders a CONFIRMED booking with reference, show, seat count, and amount', () => {
    render(
      <MemoryRouter>
        <BookingConfirmation booking={booking} show={show} />
      </MemoryRouter>,
    );
    expect(screen.getByText('SL-ABC123')).toBeInTheDocument();
    expect(screen.getByText('Interstellar')).toBeInTheDocument();
    expect(screen.getByText('Cineworld · Dhaka')).toBeInTheDocument();
    expect(screen.getByText('Screen 1')).toBeInTheDocument();
    expect(screen.getByText('3 seat(s)')).toBeInTheDocument();
    expect(screen.getByText(/৳360\.00/)).toBeInTheDocument();
  });

  it('renders even when show context is missing', () => {
    render(
      <MemoryRouter>
        <BookingConfirmation booking={booking} show={null} />
      </MemoryRouter>,
    );
    expect(screen.getByText('SL-ABC123')).toBeInTheDocument();
    expect(screen.getByText('3 seat(s)')).toBeInTheDocument();
  });
});