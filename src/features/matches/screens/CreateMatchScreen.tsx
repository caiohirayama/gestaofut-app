import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { Button, Input, Screen, Text } from '@/components/ui';
import { getApiErrorMessage } from '@/services/api/error-message';
import { useGroupStore } from '@/store/group-store';
import { spacing } from '@/theme';
import { useCreateMatch } from '../hooks/useMatches';
import { matchFormSchema, type MatchFormValues } from '../schemas/match-form-schema';
import { toMatchDates } from '../utils/match-form-datetime';

const EMPTY_VALUES: MatchFormValues = {
  locationName: '',
  locationAddress: '',
  date: '',
  startTime: '',
  durationMinutes: '120',
};

/**
 * "Criar jogo" — mirrors `EventFormScreen`'s structure (React Hook Form +
 * zodResolver, date/time/duration as plain validated text inputs combined
 * client-side into `startsAt`/`endsAt`). A created match starts SCHEDULED —
 * "Abrir jogo" (enrolling mensalistas/goleiros) is a separate action from
 * `MatchDetailsScreen`'s admin section, see gestaofut-app docs/matches.md.
 */
export function CreateMatchScreen() {
  const groupId = useGroupStore((state) => state.activeGroupId);
  const createMutation = useCreateMatch(groupId ?? '');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<MatchFormValues>({
    resolver: zodResolver(matchFormSchema),
    mode: 'onBlur',
    defaultValues: EMPTY_VALUES,
  });

  async function onSubmit(values: MatchFormValues) {
    const dates = toMatchDates(values.date, values.startTime, values.durationMinutes);
    if (!dates || !groupId) return;

    try {
      const match = await createMutation.mutateAsync({
        locationName: values.locationName || undefined,
        locationAddress: values.locationAddress || undefined,
        startsAt: dates.startsAt,
        endsAt: dates.endsAt,
      });
      router.replace({ pathname: '/matches/[matchId]', params: { matchId: match.id } });
    } catch {
      // surfaced via mutation.error below
    }
  }

  return (
    <Screen scroll>
      <View style={{ marginTop: spacing.xxl, marginBottom: spacing.xl }}>
        <Text variant="title">Criar jogo</Text>
      </View>

      <View style={{ gap: spacing.lg }}>
        <Controller
          control={control}
          name="date"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input label="Data" placeholder="DD/MM/AAAA" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.date?.message} keyboardType="number-pad" />
          )}
        />

        <Controller
          control={control}
          name="startTime"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input label="Horário de início" placeholder="HH:MM" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.startTime?.message} keyboardType="number-pad" />
          )}
        />

        <Controller
          control={control}
          name="durationMinutes"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Duração (minutos)"
              placeholder="120"
              value={value}
              onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ''))}
              onBlur={onBlur}
              error={errors.durationMinutes?.message}
              keyboardType="number-pad"
            />
          )}
        />

        <Controller
          control={control}
          name="locationName"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input label="Local" placeholder="Ex.: Quadra Central" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.locationName?.message} />
          )}
        />

        <Controller
          control={control}
          name="locationAddress"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input label="Endereço" placeholder="Endereço do local (opcional)" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.locationAddress?.message} />
          )}
        />

        {createMutation.isError ? (
          <Text variant="caption" color="danger" accessibilityRole="alert">
            {getApiErrorMessage(createMutation.error)}
          </Text>
        ) : null}

        <Button
          label="Criar jogo"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting || createMutation.isPending}
          disabled={!isValid || createMutation.isPending}
        />
      </View>
    </Screen>
  );
}
