import type { Match, MatchStatus } from '@/services/api/endpoints/matches';

/**
 * Not yet concluded, in the order they'll be played. Partitioning is done
 * purely on `status` (never comparing `startsAt`/`endsAt` against the
 * device clock) — the backend's status field is the single source of truth
 * for whether a match is over; a client-side time comparison would just
 * introduce clock-skew bugs for no benefit.
 */
const UPCOMING_STATUSES: readonly MatchStatus[] = ['SCHEDULED', 'OPEN', 'CLOSED', 'IN_PROGRESS'];
const HISTORY_STATUSES: readonly MatchStatus[] = ['FINISHED', 'CANCELLED'];

export function upcomingMatches(matches: Match[]): Match[] {
  return matches
    .filter((match) => UPCOMING_STATUSES.includes(match.status))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

/** Most recent first. */
export function matchHistory(matches: Match[]): Match[] {
  return matches
    .filter((match) => HISTORY_STATUSES.includes(match.status))
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
}

/** The match the Home screen highlights — the soonest upcoming one, or an in-progress one (which naturally sorts first since its startsAt already passed). */
export function pickNextMatch(matches: Match[]): Match | undefined {
  return upcomingMatches(matches)[0];
}
