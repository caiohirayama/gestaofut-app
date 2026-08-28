import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { Button, Input, Screen, Text } from '@/components/ui';
import { getApiErrorMessage } from '@/services/api/error-message';
import { useGroupStore } from '@/store/group-store';
import { spacing } from '@/theme';
import { ChipSelect } from '../components/ChipSelect';
import { useAddGroupMember } from '../hooks/useGroupMembers';
import { addGroupMemberSchema, type AddGroupMemberFormValues } from '../schemas/add-group-member-schema';
import { MEMBERSHIP_OPTIONS } from '../utils/member-labels';

export function AddPlayerScreen() {
  const groupId = useGroupStore((state) => state.activeGroupId);
  const addMemberMutation = useAddGroupMember(groupId ?? '');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<AddGroupMemberFormValues>({
    resolver: zodResolver(addGroupMemberSchema),
    mode: 'onBlur',
    defaultValues: { userId: '', membershipType: 'REGULAR' },
  });

  async function onSubmit(values: AddGroupMemberFormValues) {
    try {
      await addMemberMutation.mutateAsync(values);
      router.back();
    } catch {
      // surfaced via addMemberMutation.error below
    }
  }

  return (
    <Screen scroll>
      <View style={{ marginTop: spacing.xxl, marginBottom: spacing.xl }}>
        <Text variant="title">Adicionar jogador</Text>
        <Text variant="body" color="textSecondary" style={{ marginTop: spacing.xs }}>
          Ainda não há busca por e-mail — peça o ID do usuário para quem você quer adicionar.
        </Text>
      </View>

      <View style={{ gap: spacing.lg }}>
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
            <ChipSelect
              label="Categoria"
              options={MEMBERSHIP_OPTIONS}
              value={value}
              onChange={onChange}
              error={errors.membershipType?.message}
            />
          )}
        />

        {addMemberMutation.isError ? (
          <Text variant="caption" color="danger" accessibilityRole="alert">
            {getApiErrorMessage(addMemberMutation.error, {
              CONFLICT: 'Este usuário já é membro do grupo.',
              NOT_FOUND: 'Nenhum usuário encontrado com esse ID.',
            })}
          </Text>
        ) : null}

        <Button
          label="Adicionar"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting || addMemberMutation.isPending}
          disabled={!isValid}
        />
      </View>
    </Screen>
  );
}
