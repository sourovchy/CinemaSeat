import { useMemo } from 'react';
import type { Seat, UiSeatStatus } from '../types/api';

export const MAX_SELECTION = 10;

interface SeatMapProps {
  seats: Seat[];
  selectedIds: ReadonlySet<number>;
  onToggle: (seatId: number) => void;
  disabled?: boolean;
}

interface RowGroup {
  rowLabel: string;
  seats: Seat[];
}

function groupByRow(seats: Seat[]): RowGroup[] {
  const map = new Map<string, Seat[]>();
  for (const seat of seats) {
    const list = map.get(seat.row_label) ?? [];
    list.push(seat);
    map.set(seat.row_label, list);
  }
  const rows: RowGroup[] = [];
  for (const [rowLabel, rowSeats] of map.entries()) {
    rowSeats.sort((a, b) => a.seat_number - b.seat_number);
    rows.push({ rowLabel, seats: rowSeats });
  }
  // Sort rows by their alphabetical label so layout is stable.
  rows.sort((a, b) => a.rowLabel.localeCompare(b.rowLabel));
  return rows;
}

function deriveUiStatus(
  seat: Seat,
  selectedIds: ReadonlySet<number>,
): UiSeatStatus {
  if (selectedIds.has(seat.seat_id)) return 'SELECTED';
  return seat.status;
}

interface SeatButtonProps {
  seat: Seat;
  uiStatus: UiSeatStatus;
  onToggle: (seatId: number) => void;
  disabled: boolean;
}

function SeatButton({ seat, uiStatus, onToggle, disabled }: SeatButtonProps) {
  const interactive = uiStatus === 'AVAILABLE' || uiStatus === 'SELECTED';
  const ariaLabel = `Row ${seat.row_label} seat ${seat.seat_number}, ${humanStatus(uiStatus)}`;
  return (
    <button
      type="button"
      className={`seat seat-${uiStatus.toLowerCase()}`}
      data-seat-id={seat.seat_id}
      data-status={uiStatus}
      aria-pressed={uiStatus === 'SELECTED'}
      aria-label={ariaLabel}
      aria-disabled={!interactive || disabled}
      disabled={!interactive || disabled}
      onClick={() => interactive && !disabled && onToggle(seat.seat_id)}
    >
      <span className="seat-number">{seat.seat_number}</span>
    </button>
  );
}

function humanStatus(s: UiSeatStatus): string {
  switch (s) {
    case 'AVAILABLE':
      return 'available';
    case 'SELECTED':
      return 'selected by you';
    case 'HELD':
      return 'held by another guest';
    case 'BOOKED':
      return 'booked';
  }
}

export function SeatMap({ seats, selectedIds, onToggle, disabled }: SeatMapProps) {
  const rows = useMemo(() => groupByRow(seats), [seats]);

  if (seats.length === 0) {
    return (
      <div className="state state-empty">
        <strong>No seats configured for this show.</strong>
      </div>
    );
  }

  return (
    <div className="seat-map">
      <div className="screen" aria-hidden="true">
        <span>SCREEN</span>
      </div>
      <div className="seat-rows" role="grid" aria-label="Seat map">
        {rows.map((row) => (
          <div className="seat-row" role="row" key={row.rowLabel}>
            <span className="row-label" aria-hidden="true">
              {row.rowLabel}
            </span>
            <div className="seats" role="presentation">
              {row.seats.map((seat) => (
                <SeatButton
                  key={seat.seat_id}
                  seat={seat}
                  uiStatus={deriveUiStatus(seat, selectedIds)}
                  onToggle={onToggle}
                  disabled={Boolean(disabled)}
                />
              ))}
            </div>
            <span className="row-label" aria-hidden="true">
              {row.rowLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SeatLegendProps {
  counts: { available: number; held: number; booked: number; selected: number };
}

export function SeatLegend({ counts }: SeatLegendProps) {
  return (
    <ul className="seat-legend" aria-label="Seat legend">
      <li>
        <span className="legend-swatch seat-available" aria-hidden="true" />
        Available ({counts.available})
      </li>
      <li>
        <span className="legend-swatch seat-held" aria-hidden="true" />
        Held ({counts.held})
      </li>
      <li>
        <span className="legend-swatch seat-booked" aria-hidden="true" />
        Booked ({counts.booked})
      </li>
      <li>
        <span className="legend-swatch seat-selected" aria-hidden="true" />
        Selected ({counts.selected})
      </li>
    </ul>
  );
}