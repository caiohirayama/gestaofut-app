import type { AppNotification } from '@/services/api/endpoints/notifications';

/** Newest first, mirrors `matchHistory`'s ordering convention (`match-lists.ts`). */
export function unreadNotifications(notifications: AppNotification[]): AppNotification[] {
  return notifications
    .filter((notification) => notification.readAt === null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function readNotifications(notifications: AppNotification[]): AppNotification[] {
  return notifications
    .filter((notification) => notification.readAt !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
