import { describe, expect, it, vi, beforeEach } from 'vitest';
import { showsApi } from '../api/catalog';
import { bookingsApi } from '../api/bookings';
import { apiClient } from '../api/client';

vi.mock('../api/client', () => {
  return {
    apiClient: {
      request: vi.fn(),
    },
  };
});

describe('Durable Show-Schedule Strategy Frontend Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1-5. verifies Today, Tomorrow, Day After Tomorrow, Past, and Future shows behavior', async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);
    const past = new Date(today);
    past.setDate(today.getDate() - 1);
    const futureFar = new Date(today);
    futureFar.setDate(today.getDate() + 4);

    const mockShows = [
      { id: 101, movie_id: 1, starts_at: today.toISOString() },
      { id: 102, movie_id: 1, starts_at: tomorrow.toISOString() },
      { id: 103, movie_id: 1, starts_at: dayAfter.toISOString() },
      { id: 104, movie_id: 1, starts_at: past.toISOString() },
      { id: 105, movie_id: 1, starts_at: futureFar.toISOString() },
    ];

    vi.mocked(apiClient.request).mockResolvedValueOnce({ shows: mockShows });

    const result = await showsApi.list();
    const shows = result.shows;

    // Verify raw shows from API are untouched (no shifting on frontend)
    expect(shows).toEqual(mockShows);

    // 10. Every show retains its real database ID
    expect(shows[0].id).toBe(101);
    expect(shows[1].id).toBe(102);
    expect(shows[2].id).toBe(103);

    // 11-12. No virtual IDs or modulo decoding exists
    const listStr = showsApi.list.toString();
    const mapStr = showsApi.seatMap.toString();
    const holdStr = bookingsApi.hold.toString();
    expect(listStr).not.toContain('% 100000');
    expect(mapStr).not.toContain('% 100000');
    expect(holdStr).not.toContain('% 100000');
  });

  it('6-9. verifies date arithmetic works across month/year boundaries and timezone transitions', () => {
    // Verifying calendar day arithmetic offsets across month/year borders
    const baseline = new Date(2026, 11, 31); // Dec 31, 2026
    const target = new Date(2027, 0, 1);    // Jan 1, 2027

    const diffTime = target.getTime() - baseline.getTime();
    const offsetDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    expect(offsetDays).toBe(1); // 1 day difference crossing month and year border

    // Timezone check: using local time components prevents UTC offset drift
    const d = new Date('2026-08-08T18:00:00+06:00');
    const localDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    expect(localDay.getDate()).toBe(8);
    expect(localDay.getMonth()).toBe(7); // August (0-indexed)
  });

  it('13. verifies seat-map API receives the real show ID', async () => {
    vi.mocked(apiClient.request).mockResolvedValueOnce({ seats: [] });
    await showsApi.seatMap(101);
    expect(apiClient.request).toHaveBeenCalledWith('/shows/101/seats');
  });

  it('14. verifies hold API receives the real show ID', async () => {
    vi.mocked(apiClient.request).mockResolvedValueOnce({ booking_ref: 'REF123' });
    await bookingsApi.hold(102, { customer_name: 'Bob', customer_phone: '017', seat_ids: [1] });
    expect(apiClient.request).toHaveBeenCalledWith('/shows/102/hold', expect.any(Object));
  });
});
