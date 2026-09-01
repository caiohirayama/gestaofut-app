import type { Href } from 'expo-router';

/**
 * Resolves straight from `data`'s resource ids (`matchId`/`eventId`/
 * `monthlyFeeId` — see gestaofut-api docs/notifications.md, "EVENTOS"),
 * never from `NotificationType`: every match-related type (`MATCH_OPENED`,
 * `CONFIRMATION_PENDING`, `WAITLIST_OFFER`, `OFFER_EXPIRING`,
 * `MATCH_REMINDER`) already lands on the same `matchId` key and the same
 * `/matches/{matchId}` screen, so branching on `type` first would just be
 * five cases collapsing into one anyway. This also means the exact same
 * function resolves both a tapped push (`response.notification.request.content.data`,
 * which never carries `type` — only the ids `ExpoPushChannel` was given)
 * and a tapped row in the in-app notification center (`AppNotification.data`).
 *
 * Falls back to the notification center itself (`/notifications`) for a
 * `data`-less notification — either an older row created before this field
 * existed, or a type this app doesn't yet know how to deep-link deeper
 * than "your notifications" (e.g. `MONTHLY_FEE_GENERATED` today only goes
 * as far as `/my-finance`, since there's no per-fee detail screen).
 */
export function resolveNotificationDeepLink(data: Record<string, unknown> | null | undefined): Href {
  if (typeof data?.matchId === 'string') {
    return { pathname: '/matches/[matchId]', params: { matchId: data.matchId } };
  }
  if (typeof data?.eventId === 'string') {
    return { pathname: '/events/[eventId]', params: { eventId: data.eventId } };
  }
  if (typeof data?.monthlyFeeId === 'string') {
    return '/my-finance';
  }
  return '/notifications';
}
