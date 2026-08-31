import { useMutation, useQuery, useQueryClient, type Query } from '@tanstack/react-query';
import {
  cancelMatchParticipant,
  confirmMatchParticipant,
  declineMatchParticipant,
  listMatchParticipants,
  requestGuestParticipation,
  type MatchParticipant,
} from '@/services/api/endpoints/matches';
import { queryKeys } from '@/services/api/query-keys';

/** While an offer is live, its countdown must catch a server-side expiration transition without the user having to pull-to-refresh — so poll faster than the default "idle" match data. */
const OFFER_POLL_INTERVAL_MS = 5000;

export function useMatchParticipants(groupId: string | undefined, matchId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.matches.participants(groupId ?? '', matchId ?? ''),
    queryFn: async ({ signal }) =>
      (await listMatchParticipants(groupId!, matchId!, signal)).participants,
    enabled: Boolean(groupId && matchId),
    refetchInterval: (query: Query<MatchParticipant[]>) =>
      query.state.data?.some((participant) => participant.status === 'OFFERED')
        ? OFFER_POLL_INTERVAL_MS
        : false,
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

/** "Entrar na lista de espera" / self-service join for a GUEST with no participant record yet — the server decides CONFIRMED vs WAITLISTED, so the response is appended to the cache rather than patched in place. */
export function useRequestGuestParticipation(groupId: string, matchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => requestGuestParticipation(groupId, matchId),
    onSuccess: (participant) => {
      const key = queryKeys.matches.participants(groupId, matchId);
      queryClient.setQueryData<MatchParticipant[]>(key, (current) =>
        current ? [...current, participant] : [participant],
      );
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
