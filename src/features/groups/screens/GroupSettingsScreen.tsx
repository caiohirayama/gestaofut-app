import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { Avatar, Button, Card, ErrorState, Input, LoadingState, Screen, Text } from '@/components/ui';
import { getApiErrorMessage } from '@/services/api/error-message';
import { useGroupStore } from '@/store/group-store';
import { spacing } from '@/theme';
import { ChipSelect } from '../components/ChipSelect';
import { GroupLogoPicker } from '../components/GroupLogoPicker';
import { useActiveGroupPermissions } from '../hooks/useActiveGroupPermissions';
import { useGroup, useUpdateGroup } from '../hooks/useGroup';
import { useGroupSettings, useUpdateGroupSettings } from '../hooks/useGroupSettings';
import { fromGroupSettings, groupSettingsFormSchema, toUpdateGroupSettingsInput, type GroupSettingsFormValues } from '../schemas/group-settings-schema';
import { updateGroupSchema, type UpdateGroupFormValues } from '../schemas/update-group-schema';
import { SPORT_OPTIONS } from '../utils/sport-labels';

export function GroupSettingsScreen() {
  const groupId = useGroupStore((state) => state.activeGroupId);
  const groupQuery = useGroup(groupId ?? undefined);
  const settingsQuery = useGroupSettings(groupId ?? undefined);
  const { can, isPending: permissionsPending } = useActiveGroupPermissions();
  const canEdit = can('group.update');

  const isPending = groupQuery.isPending || settingsQuery.isPending || permissionsPending;
  const isError = groupQuery.isError || settingsQuery.isError;

  if (isPending) {
    return (
      <Screen>
        <LoadingState label="Carregando configurações..." />
      </Screen>
    );
  }

  if (isError || !groupQuery.data || !settingsQuery.data) {
    return (
      <Screen>
        <ErrorState
          onRetry={() => {
            void groupQuery.refetch();
            void settingsQuery.refetch();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ marginTop: spacing.xxl, marginBottom: spacing.lg }}>
        <Text variant="title">Configurações</Text>
        {!canEdit ? (
          <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.xs }}>
            Você pode visualizar, mas só um administrador pode alterar essas configurações.
          </Text>
        ) : null}
      </View>

      <View style={{ gap: spacing.lg }}>
        <Card style={{ alignItems: 'center' }}>
          {canEdit ? (
            <GroupLogoPicker groupId={groupId!} name={groupQuery.data.name} logoUrl={groupQuery.data.logoUrl} />
          ) : (
            <Avatar uri={groupQuery.data.logoUrl} name={groupQuery.data.name} size={72} />
          )}
        </Card>
        <GroupFieldsForm groupId={groupId!} name={groupQuery.data.name} description={groupQuery.data.description} sportType={groupQuery.data.sportType} timezone={groupQuery.data.timezone} canEdit={canEdit} />
        <GroupSettingsForm groupId={groupId!} settings={settingsQuery.data} canEdit={canEdit} />
      </View>
    </Screen>
  );
}

interface GroupFieldsFormProps {
  groupId: string;
  name: string;
  description: string | null;
  sportType: UpdateGroupFormValues['sportType'];
  timezone: string;
  canEdit: boolean;
}

function GroupFieldsForm({ groupId, name, description, sportType, timezone, canEdit }: GroupFieldsFormProps) {
  const updateGroupMutation = useUpdateGroup(groupId);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateGroupFormValues>({
    resolver: zodResolver(updateGroupSchema),
    values: { name, description: description ?? '', sportType, timezone },
  });

  return (
    <Card>
      <Text variant="bodyStrong" style={{ marginBottom: spacing.md }}>
        Grupo
      </Text>
      <View style={{ gap: spacing.md }}>
        <Controller
          control={control}
          name="name"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input label="Nome" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} editable={canEdit} />
          )}
        />
        <Controller
          control={control}
          name="sportType"
          render={({ field: { value, onChange } }) =>
            canEdit ? (
              <ChipSelect label="Modalidade" options={SPORT_OPTIONS} value={value} onChange={onChange} error={errors.sportType?.message} />
            ) : (
              <Input label="Modalidade" value={value} editable={false} />
            )
          }
        />
        <Controller
          control={control}
          name="timezone"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input label="Fuso horário" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.timezone?.message} editable={canEdit} autoCapitalize="none" />
          )}
        />
        <Controller
          control={control}
          name="description"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input label="Descrição" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.description?.message} editable={canEdit} multiline />
          )}
        />

        {canEdit ? (
          <>
            {updateGroupMutation.isError ? (
              <Text variant="caption" color="danger" accessibilityRole="alert">
                {getApiErrorMessage(updateGroupMutation.error)}
              </Text>
            ) : null}
            {updateGroupMutation.isSuccess ? (
              <Text variant="caption" color="success">
                Salvo.
              </Text>
            ) : null}
            <Button
              label="Salvar"
              variant="secondary"
              onPress={handleSubmit((values) => updateGroupMutation.mutate(values))}
              loading={isSubmitting || updateGroupMutation.isPending}
              disabled={!isDirty}
            />
          </>
        ) : null}
      </View>
    </Card>
  );
}

interface GroupSettingsFormProps {
  groupId: string;
  settings: NonNullable<ReturnType<typeof useGroupSettings>['data']>;
  canEdit: boolean;
}

function GroupSettingsForm({ groupId, settings, canEdit }: GroupSettingsFormProps) {
  const updateSettingsMutation = useUpdateGroupSettings(groupId);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<GroupSettingsFormValues>({
    resolver: zodResolver(groupSettingsFormSchema),
    values: fromGroupSettings(settings),
  });

  return (
    <Card>
      <Text variant="bodyStrong" style={{ marginBottom: spacing.md }}>
        Configurações da pelada
      </Text>
      <View style={{ gap: spacing.md }}>
        <Controller
          control={control}
          name="maxRegularPlayers"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input label="Máximo de jogadores de linha" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.maxRegularPlayers?.message} editable={canEdit} keyboardType="number-pad" placeholder="Sem limite" />
          )}
        />
        <Controller
          control={control}
          name="maxGoalkeepers"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input label="Máximo de goleiros" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.maxGoalkeepers?.message} editable={canEdit} keyboardType="number-pad" placeholder="Sem limite" />
          )}
        />
        <Controller
          control={control}
          name="monthlyFee"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input label="Mensalidade" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.monthlyFee?.message} editable={canEdit} keyboardType="decimal-pad" placeholder="Sem cobrança" />
          )}
        />
        <Controller
          control={control}
          name="guestFee"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input label="Valor para convidados" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.guestFee?.message} editable={canEdit} keyboardType="decimal-pad" placeholder="Sem cobrança" />
          )}
        />
        <Controller
          control={control}
          name="confirmationDeadlineHours"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input label="Prazo de confirmação (horas antes)" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.confirmationDeadlineHours?.message} editable={canEdit} keyboardType="number-pad" placeholder="Sem prazo" />
          )}
        />
        <Controller
          control={control}
          name="currency"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input label="Moeda" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.currency?.message} editable={canEdit} autoCapitalize="characters" maxLength={3} />
          )}
        />
        <Controller
          control={control}
          name="timezone"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input label="Fuso horário das configurações" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.timezone?.message} editable={canEdit} autoCapitalize="none" />
          )}
        />

        {canEdit ? (
          <>
            {updateSettingsMutation.isError ? (
              <Text variant="caption" color="danger" accessibilityRole="alert">
                {getApiErrorMessage(updateSettingsMutation.error)}
              </Text>
            ) : null}
            {updateSettingsMutation.isSuccess ? (
              <Text variant="caption" color="success">
                Salvo.
              </Text>
            ) : null}
            <Button
              label="Salvar configurações"
              onPress={handleSubmit((values) => updateSettingsMutation.mutate(toUpdateGroupSettingsInput(values)))}
              loading={isSubmitting || updateSettingsMutation.isPending}
              disabled={!isDirty}
            />
          </>
        ) : null}
      </View>
    </Card>
  );
}
