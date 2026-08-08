import { formatRemaining, useCountdown } from '../hooks/useCountdown';

interface HoldCountdownProps {
  holdExpiresAt: string | null;
  onExpire?: () => void;
}

export function HoldCountdown({ holdExpiresAt, onExpire }: HoldCountdownProps) {
  const { remainingSec, expired } = useCountdown(holdExpiresAt);

  // Fire onExpire once when the visual countdown crosses zero. The server
  // is still authoritative for whether the hold has expired.
  if (expired && onExpire) {
    // Side-effect on render is normally an antipattern, but this hook
    // triggers it only at the transition boundary (expired -> true), and
    // the parent handles it idempotently.
    queueMicrotask(onExpire);
  }

  if (!holdExpiresAt) {
    return null;
  }

  const cls = expired ? 'countdown expired' : 'countdown';
  return (
    <div className={cls} aria-live="polite">
      <span className="countdown-label">Hold expires in</span>
      <span className="countdown-time">{formatRemaining(remainingSec)}</span>
      {expired ? (
        <span className="countdown-note">
          Please refresh — the server will confirm expiry.
        </span>
      ) : null}
    </div>
  );
}