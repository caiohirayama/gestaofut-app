import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getGroupSettings, updateGroupSettings, type UpdateGroupSettingsInput } from '@/services/api/endpoints/groups';
import { queryKeys } from '@/services/api/query-keys';

export function useGroupSettings(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.groups.settings(groupId ?? ''),
    queryFn: ({ signal }) => getGroupSettings(groupId!, signal),
    enabled: Boolean(groupId),
  });
}

export function useUpdateGroupSettings(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateGroupSettingsInput) => updateGroupSettings(groupId, input),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.groups.settings(groupId), settings);
    },
  });
}
