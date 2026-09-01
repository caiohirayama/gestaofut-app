import { resolveNotificationDeepLink } from './notification-deep-link';

describe('resolveNotificationDeepLink — DEEP LINKS', () => {
  it('resolves a matchId straight to /matches/{matchId}, regardless of which match-related type sent it', () => {
    expect(resolveNotificationDeepLink({ matchId: 'match-1' })).toEqual({
      pathname: '/matches/[matchId]',
      params: { matchId: 'match-1' },
    });
  });

  it('resolves an eventId to /events/{eventId}', () => {
    expect(resolveNotificationDeepLink({ eventId: 'event-1' })).toEqual({
      pathname: '/events/[eventId]',
      params: { eventId: 'event-1' },
    });
  });

  it('resolves a monthlyFeeId to /my-finance (no per-fee detail screen exists yet)', () => {
    expect(resolveNotificationDeepLink({ monthlyFeeId: 'fee-1' })).toBe('/my-finance');
  });

  it('prefers matchId over eventId/monthlyFeeId when more than one key is somehow present', () => {
    expect(resolveNotificationDeepLink({ matchId: 'match-1', eventId: 'event-1' })).toEqual({
      pathname: '/matches/[matchId]',
      params: { matchId: 'match-1' },
    });
  });

  it('falls back to the notification center for null data (an older notification, or a type with nowhere more specific to go)', () => {
    expect(resolveNotificationDeepLink(null)).toBe('/notifications');
  });

  it('falls back to the notification center for undefined data', () => {
    expect(resolveNotificationDeepLink(undefined)).toBe('/notifications');
  });

  it('falls back to the notification center for an empty data object', () => {
    expect(resolveNotificationDeepLink({})).toBe('/notifications');
  });

  it('falls back to the notification center when the expected key is present but not a string', () => {
    expect(resolveNotificationDeepLink({ matchId: 42 })).toBe('/notifications');
  });
});
