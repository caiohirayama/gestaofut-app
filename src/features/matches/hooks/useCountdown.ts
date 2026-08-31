import { useEffect, useState } from 'react';

export interface Countdown {
  remainingMs: number;
  isExpired: boolean;
  /** `mm:ss`, floored to the second, never negative. */
  formatted: string;
}

function formatMs(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function computeCountdown(targetIso: string | null): Countdown {
  if (!targetIso) {
    return { remainingMs: 0, isExpired: true, formatted: formatMs(0) };
  }
  const remainingMs = new Date(targetIso).getTime() - Date.now();
  return { remainingMs, isExpired: remainingMs <= 0, formatted: formatMs(remainingMs) };
}

/**
 * Derives a countdown from `targetIso` on every tick — `targetIso` (e.g. a
 * `MatchParticipant.offerExpiresAt`) stays the only source of truth. The
 * `setInterval` only forces a re-render; it never stores the countdown
 * value itself, so this can't drift from the server's clock the way an
 * owned `remainingMs` state variable could.
 */
export function useCountdown(targetIso: string | null): Countdown {
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!targetIso) {
      return;
    }
    const interval = setInterval(() => forceTick((tick) => tick + 1), 1000);
    return () => clearInterval(interval);
  }, [targetIso]);

  return computeCountdown(targetIso);
}
