import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PaymentStatusView } from '../components/PaymentStatusView';
import type { Booking, BookingStatus } from '../types/api';

function booking(status: BookingStatus): Booking {
  return {
    booking_ref: 'SL-1',
    show_id: 1,
    customer_name: 'Alice',
    status,
    seat_ids: [1, 2],
    amount_cents: 24000,
    hold_expires_at: '2026-01-01T00:10:00Z',
    otp_verified: false,
    payment: null,
    created_at: '2026-01-01T00:00:00Z',
  };
}

function wrap(node: React.ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

describe('PaymentStatusView', () => {
  it('does not render confirmation for HELD', () => {
    wrap(<PaymentStatusView booking={booking('HELD')} />);
    expect(
      screen.queryByText(/booking is confirmed/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Awaiting payment/)).toBeInTheDocument();
  });

  it('does not render confirmation for PAYMENT_PENDING', () => {
    wrap(<PaymentStatusView booking={booking('PAYMENT_PENDING')} />);
    expect(
      screen.queryByText(/booking is confirmed/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Payment pending/)).toBeInTheDocument();
  });

  it('renders confirmation copy for CONFIRMED', () => {
    wrap(<PaymentStatusView booking={booking('CONFIRMED')} />);
    expect(
      screen.getByText(/Payment successful/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Your booking is confirmed/)).toBeInTheDocument();
  });

  it('renders failure copy for FAILED', () => {
    wrap(<PaymentStatusView booking={booking('FAILED')} />);
    expect(screen.getByText(/Payment failed/)).toBeInTheDocument();
  });

  it('renders expiry copy for EXPIRED', () => {
    wrap(<PaymentStatusView booking={booking('EXPIRED')} />);
    expect(screen.getByText(/Hold expired/)).toBeInTheDocument();
  });
});