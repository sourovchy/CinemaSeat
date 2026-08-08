// Money formatting — backend stores cents in BIGINT, well below
// Number.MAX_SAFE_INTEGER, so we use plain Number math. The Intl locales
// ship variable currency glyphs (e.g. "BDT " in en-BD); we always emit the
// Bangladeshi taka glyph explicitly for a stable display.
export function formatCents(amountCents: number): string {
  const amount = amountCents / 100;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `৳${formatted}`;
}

export function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return iso;
  }
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}