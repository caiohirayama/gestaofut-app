import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, View, type ListRenderItemInfo } from 'react-native';
import { Avatar, Badge, Card, ErrorState, Input, LoadingState, Screen, Text } from '@/components/ui';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import type { GroupMember } from '@/services/api/endpoints/groups';
import { useGroupStore } from '@/store/group-store';
import { colors, spacing } from '@/theme';
import { ChipSelect } from '../components/ChipSelect';
import { useActiveGroupPermissions } from '../hooks/useActiveGroupPermissions';
import { useGroupMembers } from '../hooks/useGroupMembers';
import { displayNameForMember } from '../utils/member-display';
import { MEMBERSHIP_LABELS, STATUS_BADGE_VARIANT, STATUS_LABELS } from '../utils/member-labels';
import { filterMembers, MEMBER_FILTERS, MEMBER_FILTER_LABELS, type MemberFilterKey } from '../utils/filter-members';

const FILTER_OPTIONS = MEMBER_FILTERS.map((value) => ({ value, label: MEMBER_FILTER_LABELS[value] }));

export function MembersScreen() {
  const groupId = useGroupStore((state) => state.activeGroupId);
  const { data: members, isPending, isError, refetch } = useGroupMembers(groupId ?? undefined);
  const { data: me } = useCurrentUser();
  const { can } = useActiveGroupPermissions();
  const canManage = can('member.manage');

  const [filter, setFilter] = useState<MemberFilterKey>('ALL');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => filterMembers(members ?? [], filter, search), [members, filter, search]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<GroupMember>) => (
      <MemberRow
        member={item}
        currentUserId={me?.id}
        onPress={() => router.push({ pathname: '/player/[memberId]', params: { memberId: item.id } })}
      />
    ),
    [me?.id],
  );

  if (isPending) {
    return (
      <Screen>
        <LoadingState label="Carregando jogadores..." />
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
        data={filtered}
        keyExtractor={(member) => member.id}
        renderItem={renderItem}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl }}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={16}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="title">Jogadores</Text>
              {canManage ? (
                <Pressable
                  onPress={() => router.push('/add-player')}
                  accessibilityRole="button"
                  accessibilityLabel="Adicionar jogador"
                  hitSlop={8}
                >
                  <Ionicons name="person-add-outline" size={24} color={colors.primary} />
                </Pressable>
              ) : null}
            </View>
            <Input
              placeholder="Buscar por ID do usuário"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              accessibilityLabel="Buscar jogador"
            />
            <ChipSelect options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
          </View>
        }
        ListEmptyComponent={
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center', marginTop: spacing.xl }}>
            {search || filter !== 'ALL' ? 'Nenhum jogador encontrado.' : 'Nenhum jogador neste grupo ainda.'}
          </Text>
        }
      />
    </Screen>
  );
}

interface MemberRowProps {
  member: GroupMember;
  currentUserId: string | undefined;
  onPress: () => void;
}

/**
 * Memoized: with 20-100 rows, avoiding a re-render of every row when
 * unrelated state (search text, filter) changes elsewhere in the screen is
 * worth the small overhead. Financial status is intentionally not shown
 * here — the API has no finance module/field yet to gate by permission in
 * the first place (see gestaofut-api docs/architecture.md, "Não
 * implementado").
 */
const MemberRow = memo(function MemberRow({ member, currentUserId, onPress }: MemberRowProps) {
  const name = displayNameForMember(member.userId, currentUserId);

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Avatar name={name} size={40} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {name}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
              <Badge label={MEMBERSHIP_LABELS[member.membershipType]} variant="neutral" />
              <Badge label={STATUS_LABELS[member.status]} variant={STATUS_BADGE_VARIANT[member.status]} />
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </View>
      </Card>
    </Pressable>
  );
});
