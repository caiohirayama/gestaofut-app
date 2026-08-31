import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { Button, ErrorState, Input, LoadingState, Screen, Text } from '@/components/ui';
import { ChipSelect } from '@/features/groups/components/ChipSelect';
import { getApiErrorMessage } from '@/services/api/error-message';
import { useGroupStore } from '@/store/group-store';
import { spacing } from '@/theme';
import { useCreateEvent, useEvent, useUpdateEvent } from '../hooks/useEvents';
import { eventFormSchema, type EventFormValues } from '../schemas/event-form-schema';
import { durationInMinutes, toDateInput, toEventDates, toTimeInput } from '../utils/event-form-datetime';
import { EVENT_TYPE_OPTIONS } from '../utils/event-labels';

const EMPTY_VALUES: EventFormValues = {
  title: '',
  type: 'BARBECUE',
  description: '',
  locationName: '',
  date: '',
  startTime: '',
  durationMinutes: '120',
};

export interface EventFormScreenProps {
  /** Present only on the edit route (`/events/[eventId]/edit`) — its absence means "criar evento". */
  eventId?: string;
}

/**
 * Shared "criar evento" / "editar" form — mirrors `AddPlayerScreen`'s
 * structure (React Hook Form + zodResolver + `ChipSelect`). No date/time
 * picker dependency exists in this app yet, so the date/time/duration are
 * plain validated text inputs (`event-form-schema.ts`), combined client-side
 * via `event-form-datetime.ts` into the `startsAt`/`endsAt` ISO strings the
 * API expects.
 */
export function EventFormScreen({ eventId }: EventFormScreenProps) {
  const groupId = useGroupStore((state) => state.activeGroupId);
  const isEdit = Boolean(eventId);
  const eventQuery = useEvent(groupId ?? undefined, eventId);
  const createMutation = useCreateEvent(groupId ?? '');
  const updateMutation = useUpdateEvent(groupId ?? '', eventId ?? '');
  const mutation = isEdit ? updateMutation : createMutation;

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    mode: 'onBlur',
    values: eventQuery.data
      ? {
          title: eventQuery.data.title,
          type: eventQuery.data.type,
          description: eventQuery.data.description ?? '',
          locationName: eventQuery.data.locationName ?? '',
          date: toDateInput(eventQuery.data.startsAt),
          startTime: toTimeInput(eventQuery.data.startsAt),
          durationMinutes: String(durationInMinutes(eventQuery.data.startsAt, eventQuery.data.endsAt)),
        }
      : EMPTY_VALUES,
  });

  if (isEdit && eventQuery.isPending) {
    return (
      <Screen>
        <LoadingState label="Carregando evento..." />
      </Screen>
    );
  }

  if (isEdit && (eventQuery.isError || !eventQuery.data)) {
    return (
      <Screen>
        <ErrorState title="Evento não encontrado" onRetry={eventQuery.refetch} />
      </Screen>
    );
  }

  async function onSubmit(values: EventFormValues) {
    const dates = toEventDates(values.date, values.startTime, values.durationMinutes);
    if (!dates || !groupId) return;

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          type: values.type,
          title: values.title,
          description: values.description || null,
          locationName: values.locationName || null,
          startsAt: dates.startsAt,
          endsAt: dates.endsAt,
        });
        router.back();
      } else {
        const event = await createMutation.mutateAsync({
          type: values.type,
          title: values.title,
          description: values.description || undefined,
          locationName: values.locationName || undefined,
          startsAt: dates.startsAt,
          endsAt: dates.endsAt,
        });
        router.replace({ pathname: '/events/[eventId]', params: { eventId: event.id } });
      }
    } catch {
      // surfaced via mutation.error below
    }
  }

  return (
    <Screen scroll>
      <View style={{ marginTop: spacing.xxl, marginBottom: spacing.xl }}>
        <Text variant="title">{isEdit ? 'Editar evento' : 'Criar evento'}</Text>
      </View>

      <View style={{ gap: spacing.lg }}>
        <Controller
          control={control}
          name="title"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input label="Título" placeholder="Churrasco de Agosto" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.title?.message} />
          )}
        />

        <Controller
          control={control}
          name="type"
          render={({ field: { value, onChange } }) => (
            <ChipSelect label="Tipo" options={EVENT_TYPE_OPTIONS} value={value} onChange={onChange} error={errors.type?.message} />
          )}
        />

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
          name="description"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Descrição"
              placeholder="Detalhes do evento (opcional)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.description?.message}
              multiline
            />
          )}
        />

        {mutation.isError ? (
          <Text variant="caption" color="danger" accessibilityRole="alert">
            {getApiErrorMessage(mutation.error)}
          </Text>
        ) : null}

        <Button
          label={isEdit ? 'Salvar' : 'Criar evento'}
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting || mutation.isPending}
          disabled={!isValid || mutation.isPending}
        />
      </View>
    </Screen>
  );
}
