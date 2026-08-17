import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { showsApi } from '../api/catalog';
import { bookingsApi } from '../api/bookings';
import { useAsync } from '../hooks/useAsync';
import { ErrorState, EmptyState } from '../components/States';
import {
  SeatMap,
  SeatLegend,
  MAX_SELECTION,
} from '../components/SeatMap';
import { BookingSummary } from '../components/BookingSummary';
import { CustomerForm } from '../components/CustomerForm';
import { SeatMapSkeleton } from '../components/ui/Skeleton';
import { ApiError } from '../api/client';
import { formatDateTime } from '../lib/format';
import type { Show } from '../types/api';

export function SeatMapPage() {
  const { showId } = useParams<{ showId: string }>();
  const navigate = useNavigate();
  const id = Number(showId);

  const shows = useAsync(() => showsApi.list().then((r) => r.shows), []);
  const seatMapState = useAsync(() => showsApi.seatMap(id), [id]);

  const show: Show | null = useMemo(() => {
    if (!shows.data) return null;
    return shows.data.find((s) => s.id === id) ?? null;
  }, [shows.data, id]);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<ApiError | null>(null);
  const [conflictNote, setConflictNote] = useState<string | null>(null);

  const toggle = useCallback(
    (seatId: number) => {
      setConflictNote(null);
      setSubmitError(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(seatId)) {
          next.delete(seatId);
          return next;
        }
        if (next.size >= MAX_SELECTION) return prev;
        next.add(seatId);
        return next;
      });
    },
    [],
  );

  const selectedSeatLabels = useMemo(() => {
    if (!seatMapState.data) return [];
    return Array.from(selectedIds)
      .map((sid) => {
        const seat = seatMapState.data!.seats.find((s) => s.seat_id === sid);
        return seat ? `${seat.row_label}${seat.seat_number}` : `#${sid}`;
      })
      .sort();
  }, [selectedIds, seatMapState.data]);

  const totalCents = (show?.price_cents ?? 0) * selectedIds.size;

  const refreshSeatMap = useCallback(() => seatMapState.reload(), [seatMapState]);

  async function handleHold(values: {
    customer_name: string;
    customer_phone: string;
  }) {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    setConflictNote(null);
    try {
      const res = await bookingsApi.hold(id, {
        seat_ids: Array.from(selectedIds).sort((a, b) => a - b),
        ...values,
      });
      // Persist the minimal booking snapshot for the payment flow.
      sessionStorage.setItem(
        `cinemaseat:booking:${res.booking_ref}`,
        JSON.stringify(res),
      );
      navigate(`/bookings/${encodeURIComponent(res.booking_ref)}/pay`);
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err);
        if (err.code === 'SEAT_UNAVAILABLE') {
          const ids = err.payload?.unavailable_seat_ids ?? [];
          const labels = ids
            .map((sid) => {
              const seat = seatMapState.data?.seats.find(
                (s) => s.seat_id === sid,
              );
              return seat ? `${seat.row_label}${seat.seat_number}` : `#${sid}`;
            })
            .join(', ');
          setConflictNote(
            labels.length > 0
              ? `These seats were just claimed by another guest: ${labels}. Please pick again.`
              : 'Those seats are no longer available. Please pick again.',
          );
          // Remove the conflicting seats from the local selection and refresh.
          setSelectedIds((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.delete(id));
            return next;
          });
          refreshSeatMap();
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (Number.isNaN(id) || id < 1) {
    return (
      <div className="page-container">
        <EmptyState
          title="Invalid show"
          message="The show ID in the URL is not valid."
        />
        <div style={{ marginTop: 16 }}>
          <Link to="/" className="btn btn-secondary">Back to Movies</Link>
        </div>
      </div>
    );
  }

  if (shows.loading || seatMapState.loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Choose Your Seats</h1>
        </div>
        <div className="seat-layout">
          <SeatMapSkeleton />
          <div className="side-panel">
            <div className="card" style={{ padding: 'var(--space-5)', minHeight: 200 }}>
              <div className="skeleton skeleton-text-lg" style={{ width: '60%', marginBottom: 16 }} />
              <div className="skeleton skeleton-text" style={{ width: '80%', marginBottom: 8 }} />
              <div className="skeleton skeleton-text" style={{ width: '50%' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (shows.error) {
    return (
      <div className="page-container">
        <ErrorState message={shows.error.message} onRetry={shows.reload} />
      </div>
    );
  }
  if (seatMapState.error) {
    return (
      <div className="page-container">
        <ErrorState
          message={seatMapState.error.message}
          onRetry={refreshSeatMap}
        />
      </div>
    );
  }
  if (!seatMapState.data) {
    return (
      <div className="page-container">
        <EmptyState
          title="No seat map"
          message="No seat map is available for this show."
        />
      </div>
    );
  }

  const counts = {
    available: seatMapState.data.summary.available,
    held: seatMapState.data.summary.held,
    booked: seatMapState.data.summary.booked,
    selected: selectedIds.size,
  };

  return (
    <div className="page-container">
      {/* Compact Contextual Booking Header */}
      <div className="booking-context-header" style={{ marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
          {show?.movie_title}
        </h1>
        <div style={{ color: 'var(--color-text-secondary)', display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px', fontSize: 'var(--text-sm)', alignItems: 'center' }}>
          <span>{show?.theatre_name}</span>
          <span style={{ color: 'var(--color-text-dim)' }}>•</span>
          <span>{show?.screen_name}</span>
          <span style={{ color: 'var(--color-text-dim)' }}>•</span>
          <span>{show ? formatDateTime(show.starts_at) : ''}</span>
        </div>
        <div style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginTop: 'var(--space-4)', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Choose Seats
        </div>
      </div>

      <SeatLegend counts={counts} />

      <div className="seat-layout">
        <SeatMap
          seats={seatMapState.data.seats}
          selectedIds={selectedIds}
          onToggle={toggle}
          disabled={submitting}
          screenName={show?.screen_name}
        />
        <div className="side-panel">
          <BookingSummary
            show={show}
            selectedSeatLabels={selectedSeatLabels}
            totalCents={totalCents}
          />
          <CustomerForm
            onSubmit={handleHold}
            submitting={submitting}
            disabled={selectedIds.size === 0}
          />
          {selectedIds.size === MAX_SELECTION ? (
            <p className="hint" style={{ textAlign: 'center' }}>
              Maximum of {MAX_SELECTION} seats selected.
            </p>
          ) : null}
          {submitError && submitError.code !== 'SEAT_UNAVAILABLE' ? (
            <div className="form-error" role="alert">
              {submitError.message}
            </div>
          ) : null}
          {conflictNote ? (
            <div className="form-error" role="alert">
              {conflictNote}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}