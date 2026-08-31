import { useQuery } from '@tanstack/react-query';
import { getMyEventEntitlement } from '@/services/api/endpoints/events';
import { queryKeys } from '@/services/api/query-keys';

/** "Incluso na mensalidade" — null when the caller has no non-revoked entitlement for this event. */
export function useMyEventEntitlement(groupId: string | undefined, eventId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.events.myEntitlement(groupId ?? '', eventId ?? ''),
    queryFn: async ({ signal }) => (await getMyEventEntitlement(groupId!, eventId!, signal)).entitlement,
    enabled: Boolean(groupId && eventId),
  });
}
