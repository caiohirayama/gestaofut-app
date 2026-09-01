import { useQuery } from '@tanstack/react-query';
import { getMatchRosterPreview } from '@/services/api/endpoints/matches';
import { queryKeys } from '@/services/api/query-keys';

/** "Compartilhar escala": requests the shareable roster text preview for one match — see gestaofut-api docs/matches.md, "ESCALA COMPARTILHÁVEL". */
export function useMatchRosterPreview(groupId: string | undefined, matchId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.matches.roster(groupId ?? '', matchId ?? ''),
    queryFn: async ({ signal }) => (await getMatchRosterPreview(groupId!, matchId!, signal)).text,
    enabled: Boolean(groupId && matchId),
  });
}
