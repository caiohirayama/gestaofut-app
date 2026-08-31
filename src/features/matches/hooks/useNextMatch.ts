import { useMemo } from 'react';
import { pickNextMatch } from '../utils/match-lists';
import { useMatches } from './useMatches';

/** The match the Home screen highlights — see `pickNextMatch`. */
export function useNextMatch(groupId: string | undefined) {
  const query = useMatches(groupId);
  const nextMatch = useMemo(() => pickNextMatch(query.data ?? []), [query.data]);
  return { ...query, data: nextMatch };
}
