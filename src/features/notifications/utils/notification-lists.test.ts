import type { AppNotification } from '@/services/api/endpoints/notifications';
import { readNotifications, unreadNotifications } from './notification-lists';

function makeNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'notification-1',
    userId: 'user-1',
    groupId: 'group-1',
    type: 'MATCH_OPENED',
    title: 'Um jogo foi aberto',
    body: 'Confirme sua presença.',
    data: null,
    readAt: null,
    createdAt: '2026-03-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('NOTIFICATION CENTER — não lidas / lidas', () => {
  it('unreadNotifications keeps only readAt === null, newest first', () => {
    const older = makeNotification({ id: '1', readAt: null, createdAt: '2026-03-01T10:00:00.000Z' });
    const newer = makeNotification({ id: '2', readAt: null, createdAt: '2026-03-01T12:00:00.000Z' });
    const read = makeNotification({ id: '3', readAt: '2026-03-01T13:00:00.000Z' });

    expect(unreadNotifications([older, newer, read]).map((n) => n.id)).toEqual(['2', '1']);
  });

  it('readNotifications keeps only readAt !== null, newest first', () => {
    const unread = makeNotification({ id: '1', readAt: null });
    const olderRead = makeNotification({ id: '2', readAt: '2026-03-01T09:00:00.000Z', createdAt: '2026-03-01T08:00:00.000Z' });
    const newerRead = makeNotification({ id: '3', readAt: '2026-03-01T09:00:00.000Z', createdAt: '2026-03-01T11:00:00.000Z' });

    expect(readNotifications([unread, olderRead, newerRead]).map((n) => n.id)).toEqual(['3', '2']);
  });

  it('every notification lands in exactly one of the two lists', () => {
    const notifications = [
      makeNotification({ id: '1', readAt: null }),
      makeNotification({ id: '2', readAt: '2026-03-01T09:00:00.000Z' }),
    ];

    expect(unreadNotifications(notifications).map((n) => n.id)).toEqual(['1']);
    expect(readNotifications(notifications).map((n) => n.id)).toEqual(['2']);
  });

  it('returns an empty array for an empty input', () => {
    expect(unreadNotifications([])).toEqual([]);
    expect(readNotifications([])).toEqual([]);
  });
});
