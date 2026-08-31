import { useLocalSearchParams } from 'expo-router';
import { Alert, View } from 'react-native';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
  Screen,
  Text,
} from '@/components/ui';
import { InfoRow } from '@/components/common/InfoRow';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import type { GroupMemberHistoryEntry, MembershipType } from '@/services/api/endpoints/groups';
import { useGroupStore } from '@/store/group-store';
import { spacing } from '@/theme';
import { ChipSelect } from '../components/ChipSelect';
import { useActiveGroupPermissions } from '../hooks/useActiveGroupPermissions';
import { useGroupMemberHistory } from '../hooks/useGroupMemberHistory';
import {
  useDeactivateGroupMember,
  useGroupMember,
  usePromoteGroupMember,
  useUpdateGroupMember,
} from '../hooks/useGroupMembers';
import { displayNameForMember } from '../utils/member-display';
import {
  MEMBERSHIP_LABELS,
  MEMBERSHIP_OPTIONS,
  STATUS_BADGE_VARIANT,
  STATUS_LABELS,
} from '../utils/member-labels';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR');
}

function historyDescription(entry: GroupMemberHistoryEntry): string {
  if (!entry.fromMembershipType || !entry.fromStatus) {
    return `Entrou como ${MEMBERSHIP_LABELS[entry.toMembershipType]}`;
  }
  const typeChanged = entry.fromMembershipType !== entry.toMembershipType;
  const statusChanged = entry.fromStatus !== entry.toStatus;
  if (typeChanged && statusChanged) {
    return `${MEMBERSHIP_LABELS[entry.fromMembershipType]} (${STATUS_LABELS[entry.fromStatus]}) → ${MEMBERSHIP_LABELS[entry.toMembershipType]} (${STATUS_LABELS[entry.toStatus]})`;
  }
  if (typeChanged) {
    return `${MEMBERSHIP_LABELS[entry.fromMembershipType]} → ${MEMBERSHIP_LABELS[entry.toMembershipType]}`;
  }
  return `${STATUS_LABELS[entry.fromStatus]} → ${STATUS_LABELS[entry.toStatus]}`;
}

export function PlayerDetailScreen() {
  const { memberId } = useLocalSearchParams<{ memberId: string }>();
  const groupId = useGroupStore((state) => state.activeGroupId);
  const {
    data: member,
    isPending,
    isError,
    refetch,
  } = useGroupMember(groupId ?? undefined, memberId);
  const { data: history, isPending: isHistoryPending } = useGroupMemberHistory(
    groupId ?? undefined,
    memberId,
  );
  const { data: me } = useCurrentUser();
  const { can } = useActiveGroupPermissions();
  const canManage = can('member.manage');

  const updateMutation = useUpdateGroupMember(groupId ?? '');
  const deactivateMutation = useDeactivateGroupMember(groupId ?? '');
  const promoteMutation = usePromoteGroupMember(groupId ?? '');

  if (isPending) {
    return (
      <Screen>
        <LoadingState label="Carregando jogador..." />
      </Screen>
    );
  }

  if (isError || !member) {
    return (
      <Screen>
        <ErrorState title="Jogador não encontrado" onRetry={refetch} />
      </Screen>
    );
  }

  const name = displayNameForMember(member.userId, me?.id);

  function confirmChangeCategory(newType: MembershipType) {
    if (!member || newType === member.membershipType) return;
    Alert.alert(
      'Alterar categoria',
      `Alterar ${name} de ${MEMBERSHIP_LABELS[member.membershipType]} para ${MEMBERSHIP_LABELS[newType]}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => updateMutation.mutate({ memberId: member.id, membershipType: newType }),
        },
      ],
    );
  }

  function confirmDeactivate() {
    if (!member) return;
    Alert.alert(
      'Desativar jogador',
      `Tem certeza que deseja desativar ${name}? Essa é a única forma de remover a vaga permanentemente — faltas ou pendências financeiras nunca fazem isso sozinhas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desativar',
          style: 'destructive',
          onPress: () => deactivateMutation.mutate(member.id),
        },
      ],
    );
  }

  function confirmPromote() {
    if (!member) return;
    Alert.alert('Promover para mensalista', `Promover ${name} de avulso para mensalista?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Promover', onPress: () => promoteMutation.mutate(member.id) },
    ]);
  }

  return (
    <Screen scroll>
      <View
        style={{
          alignItems: 'center',
          marginTop: spacing.xxl,
          marginBottom: spacing.xl,
          gap: spacing.sm,
        }}
      >
        <Avatar name={name} size={64} />
        <Text variant="title">{name}</Text>
      </View>

      <View style={{ gap: spacing.lg }}>
        <Card>
          <Text variant="bodyStrong" style={{ marginBottom: spacing.sm }}>
            Informações básicas
          </Text>
          <InfoRow label="ID do usuário" value={member.userId} />
          <InfoRow
            label="Categoria"
            value={<Badge label={MEMBERSHIP_LABELS[member.membershipType]} variant="neutral" />}
          />
          <InfoRow
            label="Status"
            value={
              <Badge
                label={STATUS_LABELS[member.status]}
                variant={STATUS_BADGE_VARIANT[member.status]}
              />
            }
          />
        </Card>

        <Card>
          <Text variant="bodyStrong" style={{ marginBottom: spacing.sm }}>
            Membership
          </Text>
          <InfoRow label="Entrou em" value={formatDateTime(member.joinedAt)} />
          {member.leftAt ? <InfoRow label="Saiu em" value={formatDateTime(member.leftAt)} /> : null}
        </Card>

        <Card>
          <Text variant="bodyStrong" style={{ marginBottom: spacing.sm }}>
            Histórico
          </Text>
          {isHistoryPending ? (
            <LoadingState />
          ) : !history || history.length === 0 ? (
            <Text variant="body" color="textSecondary">
              Nenhum histórico ainda.
            </Text>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {history.map((entry) => (
                <View key={entry.id}>
                  <Text variant="body">{historyDescription(entry)}</Text>
                  <Text variant="caption" color="textTertiary">
                    {formatDateTime(entry.createdAt)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {canManage ? (
          <Card>
            <Text variant="bodyStrong" style={{ marginBottom: spacing.sm }}>
              Administração
            </Text>
            <View style={{ gap: spacing.md }}>
              <ChipSelect
                label="Alterar categoria"
                options={MEMBERSHIP_OPTIONS}
                value={member.membershipType}
                onChange={confirmChangeCategory}
              />
              {member.membershipType === 'GUEST' ? (
                <Button
                  label="Promover para mensalista"
                  variant="secondary"
                  onPress={confirmPromote}
                  loading={promoteMutation.isPending}
                />
              ) : null}
              <Button
                label="Desativar"
                variant="danger"
                onPress={confirmDeactivate}
                loading={deactivateMutation.isPending}
                disabled={member.status === 'INACTIVE'}
              />
              {updateMutation.isError || deactivateMutation.isError || promoteMutation.isError ? (
                <Text variant="caption" color="danger" accessibilityRole="alert">
                  Não foi possível concluir a ação. Tente novamente.
                </Text>
              ) : null}
            </View>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
