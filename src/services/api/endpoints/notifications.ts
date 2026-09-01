import { apiFetch } from '../client';

/** Mirrors gestaofut-api's `NOTIFICATION_TYPES` (see its docs/notifications.md, "EVENTOS"). */
export const NOTIFICATION_TYPES = [
  'MATCH_OPENED',
  'CONFIRMATION_PENDING',
  'WAITLIST_OFFER',
  'OFFER_EXPIRING',
  'MONTHLY_FEE_GENERATED',
  'EVENT_OPENED',
  'MATCH_REMINDER',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * `data` carries only the resource ids a deep link needs (e.g.
 * `{ matchId }`, `{ eventId }`, `{ monthlyFeeId }`) — see
 * `utils/notification-deep-link.ts` for how each `type` maps to a route.
 * Never anything sensitive: gestaofut-api's own docs/notifications.md,
 * "SEGURANÇA" guarantees title/body/data never carry a monetary amount,
 * since a push can sit on a lock screen.
 */
export interface AppNotification {
  id: string;
  userId: string;
  groupId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export const PUSH_PLATFORMS = ['IOS', 'ANDROID'] as const;
export type PushPlatform = (typeof PUSH_PLATFORMS)[number];

export type PushSubscriptionStatus = 'ACTIVE' | 'REVOKED';

export interface PushSubscription {
  id: string;
  userId: string;
  token: string;
  platform: PushPlatform;
  status: PushSubscriptionStatus;
  createdAt: string;
  updatedAt: string;
}

export function listNotifications(
  filters?: { unreadOnly?: boolean },
  signal?: AbortSignal,
): Promise<{ notifications: AppNotification[] }> {
  const query = filters?.unreadOnly ? '?unreadOnly=true' : '';
  return apiFetch<{ notifications: AppNotification[] }>(`/me/notifications${query}`, { signal });
}

export function markNotificationRead(notificationId: string): Promise<AppNotification> {
  return apiFetch<AppNotification>(`/me/notifications/${notificationId}/read`, { method: 'POST' });
}

/** Registers (or reactivates, if the same token was previously revoked) this device's Expo Push Token. */
export function registerPushSubscription(input: { token: string; platform: PushPlatform }): Promise<PushSubscription> {
  return apiFetch<PushSubscription>('/me/push-subscriptions', { method: 'POST', body: input });
}

export function revokePushSubscription(pushSubscriptionId: string): Promise<PushSubscription> {
  return apiFetch<PushSubscription>(`/me/push-subscriptions/${pushSubscriptionId}/revoke`, { method: 'POST' });
}
