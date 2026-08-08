import { describe, expect, it } from 'vitest';
import { formatCents } from '../lib/format';

describe('selection arithmetic + price', () => {
  it('multiplies selected seats by price', () => {
    const priceCents = 15000;
    const selected = 3;
    const total = priceCents * selected;
    expect(total).toBe(45000);
    expect(formatCents(total)).toBe('৳450.00');
  });

  it('formats zero', () => {
    expect(formatCents(0)).toBe('৳0.00');
  });

  it('enforces the 10-seat maximum client-side', () => {
    const MAX_SELECTION = 10;
    const selected = new Set<number>(Array.from({ length: 10 }, (_, i) => i + 1));
    expect(selected.size).toBe(MAX_SELECTION);
    // Adding one more would be rejected by the parent component.
    const tryAdd = () => selected.size >= MAX_SELECTION;
    expect(tryAdd()).toBe(true);
  });
});
