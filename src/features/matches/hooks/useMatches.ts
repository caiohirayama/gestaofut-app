import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createMatch, getMatch, listMatches, openMatch, type CreateMatchInput, type Match } from '@/services/api/endpoints/matches';
import { queryKeys } from '@/services/api/query-keys';

/**
 * Fetches the group's full match list, unfiltered — partitioning into
 * upcoming/history (`src/features/matches/utils/match-lists.ts`) happens
 * client-side, the same pattern `filterMembers` already established for
 * `GroupMember`: the API only accepts one exact `?status=` value per
 * request, so it can't express "upcoming" (four statuses) or "history"
 * (two statuses) in a single call anyway.
 */
export function useMatches(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.matches.list(groupId ?? ''),
    queryFn: async ({ signal }) => (await listMatches(groupId!, undefined, signal)).matches,
    enabled: Boolean(groupId),
  });
}

export function useMatch(groupId: string | undefined, matchId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.matches.detail(groupId ?? '', matchId ?? ''),
    queryFn: ({ signal }) => getMatch(groupId!, matchId!, signal),
    enabled: Boolean(groupId && matchId),
  });
}

export function useCreateMatch(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMatchInput) => createMatch(groupId, input),
    onSuccess: (match: Match) => {
      queryClient.setQueryData(queryKeys.matches.detail(groupId, match.id), match);
      void queryClient.invalidateQueries({ queryKey: queryKeys.matches.list(groupId) });
    },
  });
}

/** "Abrir jogo" — SCHEDULED -> OPEN, enrolling active mensalistas/goleiros. */
export function useOpenMatch(groupId: string, matchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => openMatch(groupId, matchId),
    onSuccess: (match: Match) => {
      queryClient.setQueryData(queryKeys.matches.detail(groupId, matchId), match);
      void queryClient.invalidateQueries({ queryKey: queryKeys.matches.list(groupId) });
    },
  });
}
