import type { MatchParticipant } from '@/services/api/endpoints/matches';
import {
  buildAdminRoster,
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

describe('buildAdminRoster', () => {
  it('buckets REGULAR participants into confirmed/pending/absent', () => {
    const participants = [
      participant({ id: '1', status: 'CONFIRMED' }),
      participant({ id: '2', status: 'PENDING' }),
      participant({ id: '3', status: 'WAITLISTED' }),
      participant({ id: '4', status: 'OFFERED' }),
      participant({ id: '5', status: 'DECLINED' }),
      participant({ id: '6', status: 'CANCELLED' }),
    ];

    const roster = buildAdminRoster(participants);

    expect(roster.confirmed.map((p) => p.id)).toEqual(['1']);
    expect(roster.pending.map((p) => p.id)).toEqual(['2', '3', '4']);
    expect(roster.absent.map((p) => p.id)).toEqual(['5', '6']);
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
});
