import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, View, type ListRenderItemInfo } from 'react-native';
import { ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { ChipSelect } from '@/features/groups/components/ChipSelect';
import type { Match } from '@/services/api/endpoints/matches';
import { useGroupStore } from '@/store/group-store';
import { spacing } from '@/theme';
import { MatchListRow } from '../components/MatchListRow';
import { useMatches } from '../hooks/useMatches';
import { matchHistory, upcomingMatches } from '../utils/match-lists';

type GamesTab = 'UPCOMING' | 'HISTORY';

const TAB_OPTIONS: { value: GamesTab; label: string }[] = [
  { value: 'UPCOMING', label: 'Próximos' },
  { value: 'HISTORY', label: 'Histórico' },
];

/**
 * "JOGOS": lista de próximos jogos + histórico, ambos derivados de uma
 * única busca sem filtro de servidor (ver `useMatches` — a API só aceita um
 * `?status=` exato por vez, o mesmo limite já documentado para
 * `GroupMember`). Sem paginação porque o contrato atual da API também não
 * oferece uma — ver docs/matches.md.
 */
export function GamesScreen() {
  const groupId = useGroupStore((state) => state.activeGroupId);
  const { data: matches, isPending, isError, refetch } = useMatches(groupId ?? undefined);
  const [tab, setTab] = useState<GamesTab>('UPCOMING');

  const list = useMemo(() => {
    if (!matches) return [];
    return tab === 'UPCOMING' ? upcomingMatches(matches) : matchHistory(matches);
  }, [matches, tab]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Match>) => (
      <MatchListRow
        match={item}
        onPress={() => router.push({ pathname: '/matches/[matchId]', params: { matchId: item.id } })}
      />
    ),
    [],
  );

  if (isPending) {
    return (
      <Screen>
        <LoadingState label="Carregando jogos..." />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={list}
        keyExtractor={(match) => match.id}
        renderItem={renderItem}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl }}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
            <Text variant="title">Jogos</Text>
            <ChipSelect options={TAB_OPTIONS} value={tab} onChange={setTab} />
          </View>
        }
        ListEmptyComponent={
          <Text
            variant="body"
            color="textSecondary"
            style={{ textAlign: 'center', marginTop: spacing.xl }}
          >
            {tab === 'UPCOMING' ? 'Nenhum jogo agendado.' : 'Nenhum jogo no histórico ainda.'}
          </Text>
        }
      />
    </Screen>
  );
}
