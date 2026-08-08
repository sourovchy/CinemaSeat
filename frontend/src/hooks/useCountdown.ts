import { useEffect, useState } from 'react';

export interface CountdownState {
  /** Seconds remaining (negative if expired). */
  remainingSec: number;
  expired: boolean;
}

// Visual countdown only. The server is authoritative for expiry — when this
// hook returns expired=true, the UI must still refresh booking status and
// the seat map; the timer does not release seats.
export function useCountdown(targetIso: string | null): CountdownState {
  const targetMs = targetIso ? new Date(targetIso).getTime() : null;
  const compute = (): CountdownState => {
    if (targetMs === null || Number.isNaN(targetMs)) {
      return { remainingSec: 0, expired: true };
    }
    const diffMs = targetMs - Date.now();
    return {
      remainingSec: Math.max(0, Math.floor(diffMs / 1000)),
      expired: diffMs <= 0,
    };
  };

  const [state, setState] = useState<CountdownState>(compute);

  useEffect(() => {
    setState(compute());
    const id = setInterval(() => setState(compute()), 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetIso]);

  return state;
}

export function formatRemaining(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}