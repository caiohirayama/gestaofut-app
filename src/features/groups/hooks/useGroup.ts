import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getGroup, updateGroup, type UpdateGroupInput } from '@/services/api/endpoints/groups';
import { queryKeys } from '@/services/api/query-keys';

export function useGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.groups.detail(groupId ?? ''),
    queryFn: ({ signal }) => getGroup(groupId!, signal),
    enabled: Boolean(groupId),
  });
}

export function useUpdateGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateGroupInput) => updateGroup(groupId, input),
    onSuccess: (group) => {
      queryClient.setQueryData(queryKeys.groups.detail(groupId), group);
      void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.groups(group.organizationId) });
    },
  });
}
