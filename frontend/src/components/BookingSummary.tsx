import { formatCents, formatDateTime } from '../lib/format';
import type { Show } from '../types/api';

interface BookingSummaryProps {
  show: Show | null;
  selectedSeatLabels: string[];
  totalCents: number;
}

export function BookingSummary({
  show,
  selectedSeatLabels,
  totalCents,
}: BookingSummaryProps) {
  const qty = selectedSeatLabels.length;
  const pricePerTicket = show ? show.price_cents : 0;
  
  // Convenience fee: flat ৳40 if seats are selected
  const convenienceFeeCents = qty > 0 ? 4000 : 0; 
  const grandTotalCents = qty > 0 ? totalCents + convenienceFeeCents : 0;

  // Determine Format
  const formatVal = '2D';

  return (
    <aside className="card booking-summary" aria-label="Booking summary" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)' }}>Receipt Summary</h3>
      {show ? (
        <dl className="summary-meta" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div>
            <dt>Movie</dt>
            <dd style={{ fontWeight: 700, color: 'var(--color-text)' }}>{show.movie_title}</dd>
          </div>
          <div>
            <dt>Theatre</dt>
            <dd style={{ color: 'var(--color-text-secondary)' }}>{show.theatre_name}</dd>
          </div>
          <div>
            <dt>Hall / Format</dt>
            <dd>{show.screen_name} · <span style={{ color: 'var(--color-highlight)', fontWeight: 600 }}>{formatVal}</span></dd>
          </div>
          <div>
            <dt>Showtime</dt>
            <dd>{formatDateTime(show.starts_at)}</dd>
          </div>
          <div>
            <dt>Selected Seats</dt>
            <dd style={{ color: 'var(--color-text)', fontWeight: 700 }}>
              {qty === 0 ? '— none selected —' : selectedSeatLabels.join(', ')}
            </dd>
          </div>
          {qty > 0 && (
            <>
              <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--space-2)' }}>
                <dt>Ticket Price</dt>
                <dd>{formatCents(pricePerTicket)} x {qty}</dd>
              </div>
              <div>
                <dt>Subtotal</dt>
                <dd>{formatCents(totalCents)}</dd>
              </div>
              <div>
                <dt>Convenience Fee</dt>
                <dd>{formatCents(convenienceFeeCents)}</dd>
              </div>
              <div style={{ borderTop: '2px dashed var(--color-border)', paddingTop: 'var(--space-3)', marginTop: 'var(--space-1)' }}>
                <dt style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: 'var(--text-base)' }}>Total Amount</dt>
                <dd style={{ color: 'var(--color-accent)', fontWeight: 800, fontSize: 'var(--text-lg)' }}>{formatCents(grandTotalCents)}</dd>
              </div>
            </>
          )}
        </dl>
      ) : (
        <p>Loading show details…</p>
      )}
    </aside>
  );
}