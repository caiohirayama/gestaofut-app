import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addGroupMember,
  listGroupMembers,
  updateGroupMember,
  type GroupMemberStatus,
  type MembershipType,
} from '@/services/api/endpoints/groups';
import { queryKeys } from '@/services/api/query-keys';

export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.groups.members(groupId ?? ''),
    queryFn: async ({ signal }) => (await listGroupMembers(groupId!, signal)).members,
    enabled: Boolean(groupId),
  });
}

export function useAddGroupMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; membershipType: MembershipType }) => addGroupMember(groupId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups.members(groupId) });
    },
  });
}

export function useUpdateGroupMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      ...input
    }: {
      memberId: string;
      membershipType?: MembershipType;
      status?: GroupMemberStatus;
    }) => updateGroupMember(groupId, memberId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups.members(groupId) });
    },
  });
}
