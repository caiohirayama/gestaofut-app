import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelMatchParticipant,
  confirmMatchParticipant,
  declineMatchParticipant,
  listMatchParticipants,
  type MatchParticipant,
} from '@/services/api/endpoints/matches';
import { queryKeys } from '@/services/api/query-keys';

export function useMatchParticipants(groupId: string | undefined, matchId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.matches.participants(groupId ?? '', matchId ?? ''),
    queryFn: async ({ signal }) =>
      (await listMatchParticipants(groupId!, matchId!, signal)).participants,
    enabled: Boolean(groupId && matchId),
  });
}

/**
 * Every mutation below patches the cached participants array directly with
 * the server's authoritative response (`setQueryData`) instead of only
 * invalidating and waiting for a refetch round-trip — confirming presence
 * is meant to feel instant ("poucos segundos", per the product brief), and
 * the response body already carries the true post-write state. The
 * `invalidateQueries` call alongside it is a background reconciliation
 * safety net, not the primary feedback path.
 */
function patchParticipant(
  queryClient: ReturnType<typeof useQueryClient>,
  groupId: string,
  matchId: string,
  updated: MatchParticipant,
) {
  const key = queryKeys.matches.participants(groupId, matchId);
  queryClient.setQueryData<MatchParticipant[]>(key, (current) =>
    current?.map((participant) => (participant.id === updated.id ? updated : participant)),
  );
  void queryClient.invalidateQueries({ queryKey: key });
}

export function useConfirmMatchParticipant(groupId: string, matchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (participantId: string) => confirmMatchParticipant(groupId, matchId, participantId),
    onSuccess: (participant) => patchParticipant(queryClient, groupId, matchId, participant),
  });
}

export function useDeclineMatchParticipant(groupId: string, matchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (participantId: string) => declineMatchParticipant(groupId, matchId, participantId),
    onSuccess: (participant) => patchParticipant(queryClient, groupId, matchId, participant),
  });
}

export function useCancelMatchParticipant(groupId: string, matchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (participantId: string) => cancelMatchParticipant(groupId, matchId, participantId),
    onSuccess: (participant) => patchParticipant(queryClient, groupId, matchId, participant),
  });
}
