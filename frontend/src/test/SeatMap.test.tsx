import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SeatMap } from '../components/SeatMap';
import type { Seat, SeatMap as SeatMapData } from '../types/api';

function makeSeat(
  id: number,
  row: string,
  number: number,
  status: 'AVAILABLE' | 'HELD' | 'BOOKED' = 'AVAILABLE',
): Seat {
  return {
    seat_id: id,
    row_label: row,
    seat_number: number,
    status,
  };
}

describe('SeatMap', () => {
  it('renders one button per seat and labels rows', () => {
    const data: SeatMapData = {
      show_id: 1,
      seats: [
        makeSeat(1, 'A', 1),
        makeSeat(2, 'A', 2),
        makeSeat(3, 'B', 1, 'HELD'),
      ],
      summary: { available: 2, held: 1, booked: 0 },
    };
    render(
      <SeatMap
        seats={data.seats}
        selectedIds={new Set()}
        onToggle={() => undefined}
      />,
    );
    expect(screen.getAllByRole('button')).toHaveLength(3);
    // Row label appears twice (left + right gutter); assert presence.
    expect(screen.getAllByText('A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('B').length).toBeGreaterThan(0);
  });

  it('does not allow selecting held or booked seats', async () => {
    const data: SeatMapData = {
      show_id: 1,
      seats: [
        makeSeat(1, 'A', 1, 'AVAILABLE'),
        makeSeat(2, 'A', 2, 'HELD'),
        makeSeat(3, 'A', 3, 'BOOKED'),
      ],
      summary: { available: 1, held: 1, booked: 1 },
    };
    const onToggle = vi.fn();
    render(
      <SeatMap
        seats={data.seats}
        selectedIds={new Set()}
        onToggle={onToggle}
      />,
    );
    const user = userEvent.setup();
    const available = screen.getByLabelText(/Row A seat 1/);
    await user.click(available);
    expect(onToggle).toHaveBeenCalledWith(1);
    onToggle.mockClear();

    const held = screen.getByLabelText(/Row A seat 2/);
    expect(held).toBeDisabled();
    await user.click(held);
    expect(onToggle).not.toHaveBeenCalled();

    const booked = screen.getByLabelText(/Row A seat 3/);
    expect(booked).toBeDisabled();
    await user.click(booked);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('marks selected seats', () => {
    const data: SeatMapData = {
      show_id: 1,
      seats: [
        makeSeat(1, 'A', 1),
        makeSeat(2, 'A', 2),
        makeSeat(3, 'A', 3, 'HELD'),
        makeSeat(4, 'A', 4, 'BOOKED'),
      ],
      summary: { available: 2, held: 1, booked: 1 },
    };
    render(
      <SeatMap
        seats={data.seats}
        selectedIds={new Set([1])}
        onToggle={() => undefined}
      />,
    );
    const selected = screen.getByLabelText(/Row A seat 1/);
    expect(selected).toHaveClass('seat-selected');
    expect(selected).toHaveAttribute('aria-pressed', 'true');
  });
});
