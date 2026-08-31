import type { Event } from '@/services/api/endpoints/events';
import { eventHistory, pickNextEvent, upcomingEvents } from './event-lists';

function event(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    groupId: 'group-1',
    type: 'BARBECUE',
    title: 'Churrasco',
    description: null,
    startsAt: '2026-03-14T18:00:00.000Z',
    endsAt: '2026-03-14T22:00:00.000Z',
    locationName: null,
    status: 'OPEN',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('upcomingEvents / eventHistory / pickNextEvent', () => {
  it('splits by status, never by comparing dates to the device clock', () => {
    const events = [
      event({ id: 'draft', status: 'DRAFT' }),
      event({ id: 'open', status: 'OPEN' }),
      event({ id: 'closed', status: 'CLOSED' }),
      event({ id: 'finished', status: 'FINISHED' }),
      event({ id: 'cancelled', status: 'CANCELLED' }),
    ];

    expect(upcomingEvents(events).map((e) => e.id).sort()).toEqual(['closed', 'draft', 'open']);
    expect(eventHistory(events).map((e) => e.id).sort()).toEqual(['cancelled', 'finished']);
  });

  it('orders upcoming events soonest-first', () => {
    const events = [
      event({ id: 'later', startsAt: '2026-04-01T18:00:00.000Z' }),
      event({ id: 'sooner', startsAt: '2026-03-01T18:00:00.000Z' }),
    ];

    expect(upcomingEvents(events).map((e) => e.id)).toEqual(['sooner', 'later']);
  });

  it('orders history most-recent-first', () => {
    const events = [
      event({ id: 'older', status: 'FINISHED', startsAt: '2026-01-01T18:00:00.000Z' }),
      event({ id: 'newer', status: 'FINISHED', startsAt: '2026-02-01T18:00:00.000Z' }),
    ];

    expect(eventHistory(events).map((e) => e.id)).toEqual(['newer', 'older']);
  });

  it('pickNextEvent returns the soonest upcoming event', () => {
    const events = [event({ id: 'later', startsAt: '2026-04-01T18:00:00.000Z' }), event({ id: 'sooner', startsAt: '2026-03-01T18:00:00.000Z' })];

    expect(pickNextEvent(events)?.id).toBe('sooner');
  });

  it('pickNextEvent returns undefined when there is no upcoming event', () => {
    expect(pickNextEvent([event({ status: 'FINISHED' })])).toBeUndefined();
  });
});
