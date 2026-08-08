import { useEffect, useRef, useState } from 'react';
import { bookingsApi } from '../api/bookings';
import { ApiError } from '../api/client';
import type { Booking, BookingStatus } from '../types/api';

const TERMINAL_STATUSES: ReadonlySet<BookingStatus> = new Set<BookingStatus>([
  'CONFIRMED',
  'FAILED',
  'EXPIRED',
]);

export interface BookingPollingState {
  booking: Booking | null;
  loading: boolean;
  error: ApiError | null;
  attempts: number;
}

export interface UseBookingPollingOptions {
  intervalMs?: number;
  maxAttempts?: number;
  onTerminal?: (b: Booking) => void;
}

// Polls GET /api/bookings/:ref until the booking reaches a terminal status
// (CONFIRMED / FAILED / EXPIRED) or attempts are exhausted.
export function useBookingPolling(
  ref: string | null,
  enabled: boolean,
  opts: UseBookingPollingOptions = {},
): BookingPollingState {
  const intervalMs = opts.intervalMs ?? 1500;
  const maxAttempts = opts.maxAttempts ?? 60;
  const onTerminalRef = useRef(opts.onTerminal);
  onTerminalRef.current = opts.onTerminal;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled && ref !== null);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!enabled || ref === null) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attemptCounter = 0;

    const tick = async () => {
      attemptCounter += 1;
      try {
        const result = await bookingsApi.get(ref);
        if (cancelled) return;
        setBooking(result);
        setLoading(false);
        setError(null);
        setAttempts(attemptCounter);

        if (TERMINAL_STATUSES.has(result.status)) {
          onTerminalRef.current?.(result);
          return;
        }
        if (attemptCounter >= maxAttempts) {
          // Stop polling; surface current state without an error.
          return;
        }
        timer = setTimeout(tick, intervalMs);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setError(err);
          setLoading(false);
          // Retry transient errors (network / 5xx) without giving up.
          if (err.status === 0 || err.status >= 500) {
            if (attemptCounter < maxAttempts) {
              timer = setTimeout(tick, intervalMs);
              return;
            }
          }
        }
      }
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [ref, enabled, intervalMs, maxAttempts]);

  return { booking, loading, error, attempts };
}