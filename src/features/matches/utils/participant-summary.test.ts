import type { MatchParticipant } from '@/services/api/endpoints/matches';
import {
  activeOffers,
  buildAdminRoster,
  computeQueueRank,
  orderedWaitlist,
  poolForType,
  summarizeGoalkeeperCapacity,
  summarizeRegularCapacity,
} from './participant-summary';

function participant(overrides: Partial<MatchParticipant> = {}): MatchParticipant {
  return {
    id: 'participant-1',
    matchId: 'match-1',
    groupMemberId: 'member-1',
    typeAtMatch: 'REGULAR',
    status: 'CONFIRMED',
    confirmedAt: '2026-01-01T00:00:00.000Z',
    cancelledAt: null,
    offeredAt: null,
    offerExpiresAt: null,
    queuePosition: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('summarizeRegularCapacity', () => {
  it('counts only CONFIRMED REGULAR participants against the snapshot capacity', () => {
    const participants = [
      participant({ id: '1', typeAtMatch: 'REGULAR', status: 'CONFIRMED' }),
      participant({ id: '2', typeAtMatch: 'REGULAR', status: 'PENDING' }),
      participant({ id: '3', typeAtMatch: 'GOALKEEPER', status: 'CONFIRMED' }),
    ];

    expect(summarizeRegularCapacity(participants, 20)).toEqual({ confirmed: 1, capacity: 20 });
  });

  it('preserves a null (unlimited) capacity', () => {
    expect(summarizeRegularCapacity([], null)).toEqual({ confirmed: 0, capacity: null });
  });
});

describe('summarizeGoalkeeperCapacity', () => {
  it('counts only CONFIRMED GOALKEEPER participants, independent of REGULAR', () => {
    const participants = [
      participant({ id: '1', typeAtMatch: 'GOALKEEPER', status: 'CONFIRMED' }),
      participant({ id: '2', typeAtMatch: 'GOALKEEPER', status: 'PENDING' }),
      participant({ id: '3', typeAtMatch: 'REGULAR', status: 'CONFIRMED' }),
    ];

    expect(summarizeGoalkeeperCapacity(participants, 2)).toEqual({ confirmed: 1, capacity: 2 });
  });
});

describe('poolForType', () => {
  it('puts REGULAR and GUEST in the REGULAR pool, GOALKEEPER in its own', () => {
    expect(poolForType('REGULAR')).toBe('REGULAR');
    expect(poolForType('GUEST')).toBe('REGULAR');
    expect(poolForType('GOALKEEPER')).toBe('GOALKEEPER');
  });
});

describe('orderedWaitlist', () => {
  it('orders WAITLISTED participants in the same pool by queuePosition', () => {
    const participants = [
      participant({ id: 'third', typeAtMatch: 'REGULAR', status: 'WAITLISTED', queuePosition: 3 }),
      participant({ id: 'first', typeAtMatch: 'GUEST', status: 'WAITLISTED', queuePosition: 1 }),
      participant({ id: 'second', typeAtMatch: 'REGULAR', status: 'WAITLISTED', queuePosition: 2 }),
      participant({ id: 'confirmed', typeAtMatch: 'REGULAR', status: 'CONFIRMED', queuePosition: null }),
      participant({ id: 'gk-waiting', typeAtMatch: 'GOALKEEPER', status: 'WAITLISTED', queuePosition: 1 }),
    ];

    expect(orderedWaitlist(participants, 'REGULAR').map((p) => p.id)).toEqual(['first', 'second', 'third']);
    expect(orderedWaitlist(participants, 'GOALKEEPER').map((p) => p.id)).toEqual(['gk-waiting']);
  });

  it('falls back to createdAt order when queuePosition ties or is missing', () => {
    const participants = [
      participant({
        id: 'later',
        status: 'WAITLISTED',
        queuePosition: null,
        createdAt: '2026-01-02T00:00:00.000Z',
      }),
      participant({
        id: 'earlier',
        status: 'WAITLISTED',
        queuePosition: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    ];

    expect(orderedWaitlist(participants, 'REGULAR').map((p) => p.id)).toEqual(['earlier', 'later']);
  });
});

describe('computeQueueRank', () => {
  it('returns the 1-based rank among currently-WAITLISTED peers in the same pool', () => {
    const target = participant({ id: 'target', typeAtMatch: 'REGULAR', status: 'WAITLISTED', queuePosition: 2 });
    const participants = [
      participant({ id: 'ahead', typeAtMatch: 'GUEST', status: 'WAITLISTED', queuePosition: 1 }),
      target,
      participant({ id: 'behind', typeAtMatch: 'REGULAR', status: 'WAITLISTED', queuePosition: 3 }),
    ];

    expect(computeQueueRank(participants, target)).toBe(2);
  });

  it('returns null when the participant is not WAITLISTED', () => {
    const target = participant({ id: 'target', status: 'CONFIRMED' });
    expect(computeQueueRank([target], target)).toBeNull();
  });
});

describe('activeOffers', () => {
  it('returns OFFERED participants sorted by soonest expiration first', () => {
    const participants = [
      participant({ id: 'later', status: 'OFFERED', offerExpiresAt: '2026-01-01T01:00:00.000Z' }),
      participant({ id: 'sooner', status: 'OFFERED', offerExpiresAt: '2026-01-01T00:00:00.000Z' }),
      participant({ id: 'not-offered', status: 'WAITLISTED' }),
    ];

    expect(activeOffers(participants).map((p) => p.id)).toEqual(['sooner', 'later']);
  });
});

describe('buildAdminRoster', () => {
  it('buckets REGULAR participants into confirmed/pending/absent, keeping pending strictly PENDING', () => {
    const participants = [
      participant({ id: '1', status: 'CONFIRMED' }),
      participant({ id: '2', status: 'PENDING' }),
      participant({ id: '3', status: 'WAITLISTED', queuePosition: 1 }),
      participant({ id: '4', status: 'OFFERED', offerExpiresAt: '2026-01-01T00:00:00.000Z' }),
      participant({ id: '5', status: 'DECLINED' }),
      participant({ id: '6', status: 'CANCELLED' }),
    ];

    const roster = buildAdminRoster(participants);

    expect(roster.confirmed.map((p) => p.id)).toEqual(['1']);
    expect(roster.pending.map((p) => p.id)).toEqual(['2']);
    expect(roster.absent.map((p) => p.id)).toEqual(['5', '6']);
    expect(roster.waitlist.map((p) => p.id)).toEqual(['3']);
    expect(roster.activeOffers.map((p) => p.id)).toEqual(['4']);
  });

  it('keeps goalkeepers and guests in their own buckets regardless of status', () => {
    const participants = [
      participant({ id: 'gk-1', typeAtMatch: 'GOALKEEPER', status: 'CONFIRMED' }),
      participant({ id: 'gk-2', typeAtMatch: 'GOALKEEPER', status: 'PENDING' }),
      participant({ id: 'guest-1', typeAtMatch: 'GUEST', status: 'CONFIRMED' }),
    ];

    const roster = buildAdminRoster(participants);

    expect(roster.goalkeepers.map((p) => p.id).sort()).toEqual(['gk-1', 'gk-2']);
    expect(roster.guests.map((p) => p.id)).toEqual(['guest-1']);
    expect(roster.confirmed).toEqual([]);
  });

  it('exposes an ordered goalkeeper waitlist separately from the regular one', () => {
    const participants = [
      participant({ id: 'gk-wait', typeAtMatch: 'GOALKEEPER', status: 'WAITLISTED', queuePosition: 1 }),
      participant({ id: 'reg-wait', typeAtMatch: 'REGULAR', status: 'WAITLISTED', queuePosition: 1 }),
    ];

    const roster = buildAdminRoster(participants);

    expect(roster.goalkeeperWaitlist.map((p) => p.id)).toEqual(['gk-wait']);
    expect(roster.waitlist.map((p) => p.id)).toEqual(['reg-wait']);
  });
});
