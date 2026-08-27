import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { FlatList, View } from 'react-native';
import { Badge, Button, Card, ErrorState, Input, LoadingState, Screen, Text } from '@/components/ui';
import type { GroupMember } from '@/services/api/endpoints/groups';
import { getApiErrorMessage } from '@/services/api/error-message';
import { useGroupStore } from '@/store/group-store';
import { spacing } from '@/theme';
import { ChipSelect } from '../components/ChipSelect';
import { useActiveGroupPermissions } from '../hooks/useActiveGroupPermissions';
import { useAddGroupMember, useGroupMembers, useUpdateGroupMember } from '../hooks/useGroupMembers';
import { addGroupMemberSchema, type AddGroupMemberFormValues } from '../schemas/add-group-member-schema';

const MEMBERSHIP_LABELS: Record<GroupMember['membershipType'], string> = {
  REGULAR: 'Linha',
  GOALKEEPER: 'Goleiro',
  GUEST: 'Convidado',
};

const MEMBERSHIP_OPTIONS = (Object.keys(MEMBERSHIP_LABELS) as GroupMember['membershipType'][]).map((value) => ({
  value,
  label: MEMBERSHIP_LABELS[value],
}));

const STATUS_BADGE_VARIANT: Record<GroupMember['status'], 'success' | 'warning' | 'neutral'> = {
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  INACTIVE: 'neutral',
};

export function MembersScreen() {
  const groupId = useGroupStore((state) => state.activeGroupId);
  const { data: members, isPending, isError, refetch } = useGroupMembers(groupId ?? undefined);
  const { can } = useActiveGroupPermissions();
  const canManage = can('member.manage');

  return (
    <Screen>
      <View style={{ marginTop: spacing.xxl, marginBottom: spacing.lg }}>
        <Text variant="title">Jogadores</Text>
      </View>

      {canManage && groupId ? <AddMemberForm groupId={groupId} /> : null}

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : members && members.length === 0 ? (
        <Text variant="body" color="textSecondary">
          Nenhum jogador neste grupo ainda.
        </Text>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(member) => member.id}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xl }}
          renderItem={({ item }) => <MemberRow member={item} groupId={groupId!} canManage={canManage} />}
        />
      )}
    </Screen>
  );
}

function AddMemberForm({ groupId }: { groupId: string }) {
  const addMemberMutation = useAddGroupMember(groupId);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddGroupMemberFormValues>({
    resolver: zodResolver(addGroupMemberSchema),
    defaultValues: { userId: '', membershipType: 'REGULAR' },
  });

  async function onSubmit(values: AddGroupMemberFormValues) {
    try {
      await addMemberMutation.mutateAsync(values);
      reset({ userId: '', membershipType: 'REGULAR' });
    } catch {
      // surfaced via addMemberMutation.error below
    }
  }

  return (
    <Card style={{ marginBottom: spacing.lg }}>
      <Text variant="bodyStrong" style={{ marginBottom: spacing.xs }}>
        Adicionar jogador
      </Text>
      <Text variant="caption" color="textTertiary" style={{ marginBottom: spacing.md }}>
        Ainda não há busca por e-mail — peça o ID do usuário para quem você quer adicionar.
      </Text>
      <View style={{ gap: spacing.md }}>
        <Controller
          control={control}
          name="userId"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="ID do usuário"
              placeholder="00000000-0000-0000-0000-000000000000"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.userId?.message}
              autoCapitalize="none"
            />
          )}
        />
        <Controller
          control={control}
          name="membershipType"
          render={({ field: { value, onChange } }) => (
            <ChipSelect options={MEMBERSHIP_OPTIONS} value={value} onChange={onChange} error={errors.membershipType?.message} />
          )}
        />
        {addMemberMutation.isError ? (
          <Text variant="caption" color="danger" accessibilityRole="alert">
            {getApiErrorMessage(addMemberMutation.error, { CONFLICT: 'Este usuário já é membro do grupo.' })}
          </Text>
        ) : null}
        <Button label="Adicionar" variant="secondary" onPress={handleSubmit(onSubmit)} loading={isSubmitting || addMemberMutation.isPending} />
      </View>
    </Card>
  );
}

function MemberRow({ member, groupId, canManage }: { member: GroupMember; groupId: string; canManage: boolean }) {
  const updateMemberMutation = useUpdateGroupMember(groupId);

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {member.userId}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
            <Badge label={MEMBERSHIP_LABELS[member.membershipType]} variant="neutral" />
            <Badge label={member.status} variant={STATUS_BADGE_VARIANT[member.status]} />
          </View>
        </View>
        {canManage && member.status !== 'INACTIVE' ? (
          <Button
            label="Remover"
            variant="ghost"
            size="md"
            fullWidth={false}
            loading={updateMemberMutation.isPending}
            onPress={() => updateMemberMutation.mutate({ memberId: member.id, status: 'INACTIVE' })}
          />
        ) : null}
      </View>
    </Card>
  );
}
