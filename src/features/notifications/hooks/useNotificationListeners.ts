import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { queryClient } from '@/services/api/query-client';
import { queryKeys } from '@/services/api/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { resolveNotificationDeepLink } from '../utils/notification-deep-link';

/**
 * "FOREGROUND": without this handler, iOS/Android silently swallow a
 * notification that arrives while the app is already open (no banner, no
 * sound) — this opts back in, so a push received in foreground is treated
 * the same as one received in background. Registered at module scope
 * (evaluated once, on import) since it's a global registration, not
 * per-component state — same reasoning as `SplashScreen.preventAutoHideAsync()`
 * at the top of `app/_layout.tsx`.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function deepLinkFromNotification(notification: Notifications.Notification): void {
  if (useAuthStore.getState().status !== 'authenticated') {
    return;
  }
  const data = notification.request.content.data as Record<string, unknown> | null;
  router.push(resolveNotificationDeepLink(data));
}

/**
 * Runs once at app start (see `useBootstrapAuth`'s identical shape) — wires
 * every moment a push can reach the app:
 *
 * - received while foregrounded ("FOREGROUND"): in addition to the OS
 *   banner above, refreshes the in-app notification center so its list/
 *   unread state reflects the new row without the user having to
 *   pull-to-refresh.
 * - tapped while the app is running or backgrounded, and tapped from a
 *   cold start (`getLastNotificationResponseAsync` — the app was killed
 *   when the user tapped it, so no listener was there to catch it):
 *   "DEEP LINKS" — both resolve the exact same way, straight from the
 *   notification's `data` (see `resolveNotificationDeepLink`).
 */
export function useNotificationListeners(): void {
  const consumedColdStart = useRef(false);

  useEffect(() => {
    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      deepLinkFromNotification(response.notification);
    });

    if (!consumedColdStart.current) {
      consumedColdStart.current = true;
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) {
          deepLinkFromNotification(response.notification);
        }
      });
    }

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);
}
