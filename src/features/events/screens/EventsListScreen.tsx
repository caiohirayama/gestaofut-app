import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, View, type ListRenderItemInfo } from 'react-native';
import { ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { ChipSelect } from '@/features/groups/components/ChipSelect';
import { useActiveGroupPermissions } from '@/features/groups/hooks/useActiveGroupPermissions';
import type { Event } from '@/services/api/endpoints/events';
import { useGroupStore } from '@/store/group-store';
import { colors, spacing } from '@/theme';
import { EventListRow } from '../components/EventListRow';
import { useEvents } from '../hooks/useEvents';
import { eventHistory, upcomingEvents } from '../utils/event-lists';

type EventsTab = 'UPCOMING' | 'HISTORY';

const TAB_OPTIONS: { value: EventsTab; label: string }[] = [
  { value: 'UPCOMING', label: 'Próximos' },
  { value: 'HISTORY', label: 'Histórico' },
];

/** "Eventos": lista de próximos eventos + histórico, mesmo padrão de `GamesScreen` (sem paginação/filtro de servidor). */
export function EventsListScreen() {
  const groupId = useGroupStore((state) => state.activeGroupId);
  const { data: events, isPending, isError, refetch } = useEvents(groupId ?? undefined);
  const { can } = useActiveGroupPermissions();
  const canManage = can('event.manage');
  const [tab, setTab] = useState<EventsTab>('UPCOMING');

  const list = useMemo(() => {
    if (!events) return [];
    return tab === 'UPCOMING' ? upcomingEvents(events) : eventHistory(events);
  }, [events, tab]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Event>) => (
      <EventListRow event={item} onPress={() => router.push({ pathname: '/events/[eventId]', params: { eventId: item.id } })} />
    ),
    [],
  );

  if (isPending) {
    return (
      <Screen>
        <LoadingState label="Carregando eventos..." />
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
        keyExtractor={(event) => event.id}
        renderItem={renderItem}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl }}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="title">Eventos</Text>
              {canManage ? (
                <Pressable
                  onPress={() => router.push('/events/create')}
                  accessibilityRole="button"
                  accessibilityLabel="Criar evento"
                  hitSlop={8}
                >
                  <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
                </Pressable>
              ) : null}
            </View>
            <ChipSelect options={TAB_OPTIONS} value={tab} onChange={setTab} />
          </View>
        }
        ListEmptyComponent={
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center', marginTop: spacing.xl }}>
            {tab === 'UPCOMING' ? 'Nenhum evento agendado.' : 'Nenhum evento no histórico ainda.'}
          </Text>
        }
      />
    </Screen>
  );
}
