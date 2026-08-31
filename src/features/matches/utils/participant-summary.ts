import type { MatchParticipant, ParticipantStatus } from '@/services/api/endpoints/matches';

export interface CapacitySummary {
  confirmed: number;
  /** `null` means unlimited — see gestaofut-api docs/matches.md. */
  capacity: number | null;
}

export function summarizeRegularCapacity(
  participants: MatchParticipant[],
  regularCapacity: number | null,
): CapacitySummary {
  return {
    confirmed: participants.filter((p) => p.typeAtMatch === 'REGULAR' && p.status === 'CONFIRMED')
      .length,
    capacity: regularCapacity,
  };
}

export function summarizeGoalkeeperCapacity(
  participants: MatchParticipant[],
  goalkeeperCapacity: number | null,
): CapacitySummary {
  return {
    confirmed: participants.filter(
      (p) => p.typeAtMatch === 'GOALKEEPER' && p.status === 'CONFIRMED',
    ).length,
    capacity: goalkeeperCapacity,
  };
}

const PENDING_ISH: readonly ParticipantStatus[] = ['PENDING', 'WAITLISTED', 'OFFERED'];
const ABSENT_ISH: readonly ParticipantStatus[] = ['DECLINED', 'CANCELLED'];

export interface AdminRoster {
  confirmed: MatchParticipant[];
  pending: MatchParticipant[];
  absent: MatchParticipant[];
  /** All goalkeeper participants regardless of status — goalkeepers have their own independent capacity, so admins need to see confirmed/pending/waitlisted goalkeepers as one group, not merged into the regular buckets above. */
  goalkeepers: MatchParticipant[];
  /** All guest participants regardless of status. */
  guests: MatchParticipant[];
}

/** Buckets a match's roster for the admin view: confirmados / pendentes / ausentes (REGULAR only) + goleiros / avulsos (their own category, any status). */
export function buildAdminRoster(participants: MatchParticipant[]): AdminRoster {
  const regulars = participants.filter((p) => p.typeAtMatch === 'REGULAR');

  return {
    confirmed: regulars.filter((p) => p.status === 'CONFIRMED'),
    pending: regulars.filter((p) => PENDING_ISH.includes(p.status)),
    absent: regulars.filter((p) => ABSENT_ISH.includes(p.status)),
    goalkeepers: participants.filter((p) => p.typeAtMatch === 'GOALKEEPER'),
    guests: participants.filter((p) => p.typeAtMatch === 'GUEST'),
  };
}
