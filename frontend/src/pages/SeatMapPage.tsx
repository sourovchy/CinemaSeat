import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { showsApi } from '../api/catalog';
import { bookingsApi } from '../api/bookings';
import { useAsync } from '../hooks/useAsync';
import { LoadingState, ErrorState, EmptyState } from '../components/States';
import {
  SeatMap,
  SeatLegend,
  MAX_SELECTION,
} from '../components/SeatMap';
import { BookingSummary } from '../components/BookingSummary';
import { CustomerForm } from '../components/CustomerForm';
import { ApiError } from '../api/client';
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
      <section className="page">
        <header className="page-header">
          <h1>Invalid show</h1>
        </header>
        <Link to="/" className="btn btn-secondary">
          Back to movies
        </Link>
      </section>
    );
  }

  if (shows.loading || seatMapState.loading) {
    return <LoadingState label="Loading seats…" />;
  }
  if (shows.error) {
    return <ErrorState message={shows.error.message} onRetry={shows.reload} />;
  }
  if (seatMapState.error) {
    return (
      <ErrorState
        message={seatMapState.error.message}
        onRetry={refreshSeatMap}
      />
    );
  }
  if (!seatMapState.data) {
    return <EmptyState message="No seat map available." />;
  }

  const counts = {
    available: seatMapState.data.summary.available,
    held: seatMapState.data.summary.held,
    booked: seatMapState.data.summary.booked,
    selected: selectedIds.size,
  };

  return (
    <section className="page page-seat-map">
      <header className="page-header">
        <h1>{show?.movie_title ?? 'Seat selection'}</h1>
        <p className="meta">
          {show ? `${show.theatre_name} · ${show.screen_name}` : ''}
        </p>
      </header>

      <SeatLegend counts={counts} />

      <div className="seat-layout">
        <SeatMap
          seats={seatMapState.data.seats}
          selectedIds={selectedIds}
          onToggle={toggle}
          disabled={submitting}
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
            <p className="hint">
              Maximum of {MAX_SELECTION} seats selected.
            </p>
          ) : null}
          {submitError && submitError.code !== 'SEAT_UNAVAILABLE' ? (
            <p className="form-error" role="alert">
              {submitError.message}
            </p>
          ) : null}
          {conflictNote ? (
            <p className="form-error" role="alert">
              {conflictNote}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}