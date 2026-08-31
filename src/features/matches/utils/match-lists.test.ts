import type { Match } from '@/services/api/endpoints/matches';
import { matchHistory, pickNextMatch, upcomingMatches } from './match-lists';

function match(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    groupId: 'group-1',
    startsAt: '2026-03-01T18:00:00.000Z',
    endsAt: '2026-03-01T19:00:00.000Z',
    status: 'OPEN',
    locationName: null,
    locationAddress: null,
    regularCapacity: 20,
    goalkeeperCapacity: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('upcomingMatches', () => {
  it('keeps only SCHEDULED/OPEN/CLOSED/IN_PROGRESS, sorted soonest-first', () => {
    const scheduled = match({
      id: 'scheduled',
      status: 'SCHEDULED',
      startsAt: '2026-03-15T00:00:00.000Z',
    });
    const open = match({ id: 'open', status: 'OPEN', startsAt: '2026-03-08T00:00:00.000Z' });
    const finished = match({
      id: 'finished',
      status: 'FINISHED',
      startsAt: '2026-02-01T00:00:00.000Z',
    });
    const cancelled = match({
      id: 'cancelled',
      status: 'CANCELLED',
      startsAt: '2026-03-05T00:00:00.000Z',
    });

    const result = upcomingMatches([scheduled, open, finished, cancelled]);

    expect(result.map((m) => m.id)).toEqual(['open', 'scheduled']);
  });

  it('an IN_PROGRESS match sorts first even though its startsAt already passed', () => {
    const inProgress = match({
      id: 'in-progress',
      status: 'IN_PROGRESS',
      startsAt: '2026-01-01T00:00:00.000Z',
    });
    const scheduled = match({
      id: 'scheduled',
      status: 'SCHEDULED',
      startsAt: '2026-06-01T00:00:00.000Z',
    });

    const result = upcomingMatches([scheduled, inProgress]);

    expect(result.map((m) => m.id)).toEqual(['in-progress', 'scheduled']);
  });
});

describe('matchHistory', () => {
  it('keeps only FINISHED/CANCELLED, most recent first', () => {
    const older = match({ id: 'older', status: 'FINISHED', startsAt: '2026-01-01T00:00:00.000Z' });
    const newer = match({ id: 'newer', status: 'CANCELLED', startsAt: '2026-02-01T00:00:00.000Z' });
    const open = match({ id: 'open', status: 'OPEN', startsAt: '2026-03-01T00:00:00.000Z' });

    const result = matchHistory([older, newer, open]);

    expect(result.map((m) => m.id)).toEqual(['newer', 'older']);
  });
});

describe('pickNextMatch', () => {
  it('returns the soonest upcoming match', () => {
    const later = match({ id: 'later', status: 'SCHEDULED', startsAt: '2026-06-01T00:00:00.000Z' });
    const sooner = match({ id: 'sooner', status: 'OPEN', startsAt: '2026-03-01T00:00:00.000Z' });

    expect(pickNextMatch([later, sooner])?.id).toBe('sooner');
  });

  it('returns undefined when there are no upcoming matches', () => {
    expect(pickNextMatch([match({ status: 'FINISHED' })])).toBeUndefined();
  });
});
