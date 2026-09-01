import { apiFetch } from '../client';
import type { EventStatus, EventType } from './events';
import type { MatchStatus } from './matches';

/**
 * Mirrors gestaofut-api's aggregated `GET /groups/:groupId/dashboard` (see
 * its docs/dashboard.md) — one request instead of separately fetching
 * next-match/participants/monthly-fees/charges/next-event/participants.
 * Every top-level section plus every `alerts.*` field is independently
 * optional: **absent** (not `null`, not `undefined` assigned — genuinely
 * missing from the JSON) means the caller's role doesn't have the
 * matching permission, and the field was never computed server-side.
 * `null` means the caller *can* see that section, there's just nothing
 * there right now (e.g. no upcoming match).
 */
export interface DashboardNextMatch {
  id: string;
  startsAt: string;
  endsAt: string;
  status: MatchStatus;
  locationName: string | null;
  regularCapacity: number | null;
  goalkeeperCapacity: number | null;
  confirmed: number;
  pending: number;
  absent: number;
  goalkeepers: number;
  guests: number;
  waitlisted: number;
}

export interface DashboardFinance {
  referenceYear: number;
  referenceMonth: number;
  /** "Mensalidades previstas" — every mensalidade billed this month, regardless of status. */
  expected: string;
  /** Mensalidade actually PAID this month. */
  received: string;
  /** Mensalidade still PENDING or OVERDUE this month. */
  pending: string;
  /** Cobranças avulsas belonging to this month. */
  adHoc: string;
}

export interface DashboardNextEvent {
  id: string;
  type: EventType;
  title: string;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
  confirmed: number;
}

export interface DashboardAlerts {
  /** Same gate as `nextMatch` (`match.read`) — `0` when there's no next match, never absent. */
  pendingConfirmations?: number;
  /** Count of OVERDUE monthly fees + charges, group-wide (not scoped to the current month). */
  pendingCharges?: number;
  /** Count of WAITING membership interests — an actionable admin queue. */
  administrativeSituations?: number;
}

export interface Dashboard {
  nextMatch?: DashboardNextMatch | null;
  finance?: DashboardFinance | null;
  nextEvent?: DashboardNextEvent | null;
  alerts: DashboardAlerts;
}

export function getDashboard(groupId: string, signal?: AbortSignal): Promise<Dashboard> {
  return apiFetch<Dashboard>(`/groups/${groupId}/dashboard`, { signal });
}
