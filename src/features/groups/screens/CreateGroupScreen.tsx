import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { Button, Input, Screen, Text } from '@/components/ui';
import { getApiErrorMessage } from '@/services/api/error-message';
import { setSecureItem, SECURE_KEYS } from '@/services/secure-storage';
import { useGroupStore } from '@/store/group-store';
import { spacing } from '@/theme';
import { ChipSelect } from '../components/ChipSelect';
import { useCreateGroup } from '../hooks/useCreateGroup';
import { createGroupSchema, type CreateGroupFormValues } from '../schemas/create-group-schema';
import { SPORT_OPTIONS } from '../utils/sport-labels';

export function CreateGroupScreen() {
  const setActiveGroup = useGroupStore((state) => state.setActiveGroup);
  const createGroupMutation = useCreateGroup();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    mode: 'onBlur',
    defaultValues: { name: '', description: '', sportType: undefined, timezone: 'America/Sao_Paulo' },
  });

  async function onSubmit(values: CreateGroupFormValues) {
    try {
      const group = await createGroupMutation.mutateAsync(values);
      setActiveGroup(group.id, group.organizationId);
      await setSecureItem(SECURE_KEYS.activeGroupId, group.id);
      router.replace('/(app)');
    } catch {
      // surfaced via createGroupMutation.error below
    }
  }

  return (
    <Screen scroll>
      <View style={{ marginTop: spacing.xxl, marginBottom: spacing.xl }}>
        <Text variant="title">Criar grupo</Text>
        <Text variant="body" color="textSecondary" style={{ marginTop: spacing.xs }}>
          Configure seu grupo esportivo para começar a organizar as peladas.
        </Text>
      </View>

      <View style={{ gap: spacing.lg }}>
        <Controller
          control={control}
          name="name"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Nome do grupo"
              placeholder="Pelada de Sábado"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.name?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="sportType"
          render={({ field: { value, onChange } }) => (
            <ChipSelect
              label="Modalidade"
              options={SPORT_OPTIONS}
              value={value}
              onChange={onChange}
              error={errors.sportType?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="timezone"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Fuso horário"
              placeholder="America/Sao_Paulo"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.timezone?.message}
              autoCapitalize="none"
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Descrição (opcional)"
              placeholder="Pelada semanal entre amigos"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.description?.message}
              multiline
            />
          )}
        />

        {createGroupMutation.isError ? (
          <Text variant="caption" color="danger" accessibilityRole="alert">
            {getApiErrorMessage(createGroupMutation.error, {
              CONFLICT: 'Não foi possível criar o grupo. Tente novamente.',
            })}
          </Text>
        ) : null}

        <Button
          label="Criar grupo"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting || createGroupMutation.isPending}
          disabled={!isValid}
        />
      </View>
    </Screen>
  );
}
