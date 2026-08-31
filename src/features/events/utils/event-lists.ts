import type { Event, EventStatus } from '@/services/api/endpoints/events';

/**
 * Not yet concluded, in the order they'll happen. Partitioning is purely
 * on `status` (never comparing `startsAt` against the device clock) —
 * mirrors `match-lists.ts`'s own rationale: the backend's status is the
 * single source of truth for whether an event is over.
 */
const UPCOMING_STATUSES: readonly EventStatus[] = ['DRAFT', 'OPEN', 'CLOSED'];
const HISTORY_STATUSES: readonly EventStatus[] = ['FINISHED', 'CANCELLED'];

export function upcomingEvents(events: Event[]): Event[] {
  return events
    .filter((event) => UPCOMING_STATUSES.includes(event.status))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

/** Most recent first. */
export function eventHistory(events: Event[]): Event[] {
  return events
    .filter((event) => HISTORY_STATUSES.includes(event.status))
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
}

/** "HOME: quando houver evento próximo" — the soonest upcoming event, or undefined when there isn't one. */
export function pickNextEvent(events: Event[]): Event | undefined {
  return upcomingEvents(events)[0];
}
