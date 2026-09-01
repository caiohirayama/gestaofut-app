import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markNotificationRead, type AppNotification } from '@/services/api/endpoints/notifications';
import { queryKeys } from '@/services/api/query-keys';

/**
 * Patches both cached list variants directly with the server's response
 * (same "instant feedback + background reconciliation" pattern as
 * `useMatchParticipants.patchParticipant`): the "todas" list
 * (`list(false)`) keeps the row but with `readAt` set, while the "não
 * lidas" list (`list(true)`) drops it — a read notification has no
 * business staying in an unread-only view. `invalidateQueries` alongside
 * is the safety net, not the primary feedback path.
 */
function patchNotificationRead(queryClient: ReturnType<typeof useQueryClient>, updated: AppNotification) {
  queryClient.setQueryData<AppNotification[]>(queryKeys.notifications.list(false), (current) =>
    current?.map((notification) => (notification.id === updated.id ? updated : notification)),
  );
  queryClient.setQueryData<AppNotification[]>(queryKeys.notifications.list(true), (current) =>
    current?.filter((notification) => notification.id !== updated.id),
  );
  void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: (updated) => patchNotificationRead(queryClient, updated),
  });
}
