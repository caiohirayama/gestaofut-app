import { useQuery } from '@tanstack/react-query';
import { listNotifications } from '@/services/api/endpoints/notifications';
import { queryKeys } from '@/services/api/query-keys';
import { useAuthStore } from '@/store/auth-store';

/** "NOTIFICATION CENTER" — self-service, scoped by the caller's own JWT (`/me/notifications`), no groupId needed. */
export function useNotifications(unreadOnly?: boolean) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.notifications.list(unreadOnly),
    queryFn: ({ signal }) => listNotifications({ unreadOnly }, signal).then((response) => response.notifications),
    enabled: status === 'authenticated',
  });
}
