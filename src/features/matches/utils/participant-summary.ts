import type { MatchParticipant, ParticipantType } from '@/services/api/endpoints/matches';

export interface CapacitySummary {
  confirmed: number;
  /** `null` means unlimited — see gestaofut-api docs/matches.md. */
  capacity: number | null;
}

export function summarizeRegularCapacity(participants: MatchParticipant[], regularCapacity: number | null): CapacitySummary {
  return {
    confirmed: participants.filter((p) => p.typeAtMatch === 'REGULAR' && p.status === 'CONFIRMED').length,
    capacity: regularCapacity,
  };
}

export function summarizeGoalkeeperCapacity(
  participants: MatchParticipant[],
  goalkeeperCapacity: number | null,
): CapacitySummary {
  return {
    confirmed: participants.filter((p) => p.typeAtMatch === 'GOALKEEPER' && p.status === 'CONFIRMED').length,
    capacity: goalkeeperCapacity,
  };
}

/** Mirrors gestaofut-api's `MatchCapacityCategory`/`POOL_TYPES` — GUEST shares the REGULAR pool (an avulso fills the same outfield slot a mensalista would), GOALKEEPER is its own. */
export type MatchCapacityPool = 'REGULAR' | 'GOALKEEPER';

const POOL_TYPES: Record<MatchCapacityPool, readonly ParticipantType[]> = {
  REGULAR: ['REGULAR', 'GUEST'],
  GOALKEEPER: ['GOALKEEPER'],
};

export function poolForType(type: ParticipantType): MatchCapacityPool {
  return type === 'GOALKEEPER' ? 'GOALKEEPER' : 'REGULAR';
}

function sortByQueuePosition(participants: MatchParticipant[]): MatchParticipant[] {
  return [...participants].sort((a, b) => {
    const posA = a.queuePosition ?? Number.MAX_SAFE_INTEGER;
    const posB = b.queuePosition ?? Number.MAX_SAFE_INTEGER;
    if (posA !== posB) return posA - posB;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

/** The WAITLISTED queue for one pool, in order — "ordem" for the admin view and the basis for a player's own "posição aproximada". */
export function orderedWaitlist(participants: MatchParticipant[], pool: MatchCapacityPool): MatchParticipant[] {
  const types = POOL_TYPES[pool];
  return sortByQueuePosition(participants.filter((p) => types.includes(p.typeAtMatch) && p.status === 'WAITLISTED'));
}

/**
 * 1-based rank of `participant` among currently-WAITLISTED peers in the
 * same pool — "aproximada" because it reflects who's *actually* still
 * waiting right now, not the raw (possibly stale, never-compacted)
 * `queuePosition` value alone. `null` if `participant` isn't WAITLISTED.
 */
export function computeQueueRank(participants: MatchParticipant[], participant: MatchParticipant): number | null {
  if (participant.status !== 'WAITLISTED') {
    return null;
  }
  const queue = orderedWaitlist(participants, poolForType(participant.typeAtMatch));
  const index = queue.findIndex((p) => p.id === participant.id);
  return index === -1 ? null : index + 1;
}

/** Every OFFERED participant, soonest-expiring first — the most time-pressured offer surfaces first for an admin watching "ofertas ativas". */
export function activeOffers(participants: MatchParticipant[]): MatchParticipant[] {
  return [...participants]
    .filter((p) => p.status === 'OFFERED')
    .sort((a, b) => new Date(a.offerExpiresAt ?? 0).getTime() - new Date(b.offerExpiresAt ?? 0).getTime());
}

export interface AdminRoster {
  confirmed: MatchParticipant[];
  /** Only literal PENDING — WAITLISTED/OFFERED have their own dedicated sections below (`waitlist`/`goalkeeperWaitlist`/`activeOffers`). */
  pending: MatchParticipant[];
  absent: MatchParticipant[];
  /** All goalkeeper participants regardless of status — goalkeepers have their own independent capacity, so admins need to see confirmed/pending/waitlisted goalkeepers as one group, not merged into the regular buckets above. */
  goalkeepers: MatchParticipant[];
  /** All guest participants regardless of status. */
  guests: MatchParticipant[];
  /** REGULAR-pool (REGULAR + GUEST) WAITLISTED queue, in order. */
  waitlist: MatchParticipant[];
  /** GOALKEEPER-pool WAITLISTED queue, in order. */
  goalkeeperWaitlist: MatchParticipant[];
  /** Every OFFERED participant across both pools, soonest-expiring first. */
  activeOffers: MatchParticipant[];
}

const ABSENT_ISH: readonly MatchParticipant['status'][] = ['DECLINED', 'CANCELLED'];

/** Buckets a match's roster for the admin view: confirmados / pendentes / ausentes (REGULAR only), goleiros / avulsos (their own category, any status), and the waitlist queues + active offers. */
export function buildAdminRoster(participants: MatchParticipant[]): AdminRoster {
  const regulars = participants.filter((p) => p.typeAtMatch === 'REGULAR');

  return {
    confirmed: regulars.filter((p) => p.status === 'CONFIRMED'),
    pending: regulars.filter((p) => p.status === 'PENDING'),
    absent: regulars.filter((p) => ABSENT_ISH.includes(p.status)),
    goalkeepers: participants.filter((p) => p.typeAtMatch === 'GOALKEEPER'),
    guests: participants.filter((p) => p.typeAtMatch === 'GUEST'),
    waitlist: orderedWaitlist(participants, 'REGULAR'),
    goalkeeperWaitlist: orderedWaitlist(participants, 'GOALKEEPER'),
    activeOffers: activeOffers(participants),
  };
}
