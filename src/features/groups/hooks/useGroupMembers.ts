import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addGroupMember,
  deactivateGroupMember,
  listGroupMembers,
  promoteGroupMember,
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

/** A single member, derived from the same cached list query — there's no GET-by-id endpoint. */
export function useGroupMember(groupId: string | undefined, memberId: string | undefined) {
  const query = useGroupMembers(groupId);
  return { ...query, data: query.data?.find((member) => member.id === memberId) };
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
    onSuccess: (_result, { memberId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups.members(groupId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups.memberHistory(groupId, memberId) });
    },
  });
}

export function useDeactivateGroupMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => deactivateGroupMember(groupId, memberId),
    onSuccess: (_result, memberId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups.members(groupId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups.memberHistory(groupId, memberId) });
    },
  });
}

export function usePromoteGroupMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => promoteGroupMember(groupId, memberId),
    onSuccess: (_result, memberId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups.members(groupId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups.memberHistory(groupId, memberId) });
    },
  });
}
