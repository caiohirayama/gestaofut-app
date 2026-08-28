import { useQuery } from '@tanstack/react-query';
import { getGroupMemberHistory } from '@/services/api/endpoints/groups';
import { queryKeys } from '@/services/api/query-keys';

export function useGroupMemberHistory(groupId: string | undefined, memberId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.groups.memberHistory(groupId ?? '', memberId ?? ''),
    queryFn: async ({ signal }) => (await getGroupMemberHistory(groupId!, memberId!, signal)).history,
    enabled: Boolean(groupId) && Boolean(memberId),
  });
}
