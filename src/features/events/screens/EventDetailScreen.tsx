import { router, useLocalSearchParams } from 'expo-router';
import { Alert, View } from 'react-native';
import { Badge, Button, Card, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { InfoRow } from '@/components/common/InfoRow';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { useActiveGroupPermissions } from '@/features/groups/hooks/useActiveGroupPermissions';
import { useGroupMembers } from '@/features/groups/hooks/useGroupMembers';
import { useGroupStore } from '@/store/group-store';
import { spacing } from '@/theme';
import { EventConfirmationButtons } from '../components/EventConfirmationButtons';
import { EventParticipantsPanel } from '../components/EventParticipantsPanel';
import { useEvent, useUpdateEvent } from '../hooks/useEvents';
import { useEventParticipants } from '../hooks/useEventParticipants';
import { useMyEventEntitlement } from '../hooks/useMyEventEntitlement';
import { useMyEventParticipant } from '../hooks/useMyEventParticipant';
import { formatEventDate, formatEventTime } from '../utils/event-datetime';
import { EVENT_STATUS_BADGE_VARIANT, EVENT_STATUS_LABELS, EVENT_TYPE_EMOJI, EVENT_TYPE_LABELS } from '../utils/event-labels';
import { CANCELLABLE_EVENT_STATUSES, NEXT_EVENT_STATUS } from '../utils/event-status-transitions';

/**
 * "EVENT DETAIL": título, data, horário, local, descrição, benefício, a
 * confirmação em si (self-service, reaproveitando `EventConfirmationButtons`)
 * e, quando autorizado (`event.manage`), as ações administrativas — editar,
 * avançar o status (rascunho → aberto → encerrado → finalizado) ou cancelar,
 * mais o roster de participantes. Ver docs/events.md.
 */
export function EventDetailScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const groupId = useGroupStore((state) => state.activeGroupId);
  const { data: event, isPending, isError, refetch } = useEvent(groupId ?? undefined, eventId);
  const { data: participants } = useEventParticipants(groupId ?? undefined, eventId);
  const { data: members } = useGroupMembers(groupId ?? undefined);
  const { data: me } = useCurrentUser();
  const { data: myParticipant } = useMyEventParticipant(groupId ?? undefined, eventId);
  const { data: entitlement } = useMyEventEntitlement(groupId ?? undefined, eventId);
  const { can } = useActiveGroupPermissions();
  const canManage = can('event.manage');
  const updateEventMutation = useUpdateEvent(groupId ?? '', eventId ?? '');

  if (isPending) {
    return (
      <Screen>
        <LoadingState label="Carregando evento..." />
      </Screen>
    );
  }

  if (isError || !event || !groupId) {
    return (
      <Screen>
        <ErrorState title="Evento não encontrado" onRetry={refetch} />
      </Screen>
    );
  }

  const nextTransition = NEXT_EVENT_STATUS[event.status];
  const isCancellable = CANCELLABLE_EVENT_STATUSES.includes(event.status);

  function confirmCancelEvent() {
    Alert.alert('Cancelar evento', `Cancelar "${event!.title}"? Essa ação não pode ser desfeita.`, [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Cancelar evento', style: 'destructive', onPress: () => updateEventMutation.mutate({ status: 'CANCELLED' }) },
    ]);
  }

  return (
    <Screen scroll>
      <View style={{ marginTop: spacing.xxl, marginBottom: spacing.lg, gap: spacing.xs }}>
        <Badge label={EVENT_STATUS_LABELS[event.status]} variant={EVENT_STATUS_BADGE_VARIANT[event.status]} />
        <Text variant="title">
          {EVENT_TYPE_EMOJI[event.type]} {event.title}
        </Text>
        <Text variant="body" color="textSecondary">
          {formatEventDate(event.startsAt)} · {formatEventTime(event.startsAt)} – {formatEventTime(event.endsAt)}
        </Text>
      </View>

      <View style={{ gap: spacing.lg }}>
        <Card>
          <Text variant="bodyStrong" style={{ marginBottom: spacing.sm }}>
            Informações
          </Text>
          <InfoRow label="Tipo" value={EVENT_TYPE_LABELS[event.type]} />
          <InfoRow label="Local" value={event.locationName ?? 'A definir'} />
          {event.description ? <InfoRow label="Descrição" value={event.description} /> : null}
          {entitlement ? (
            <InfoRow label="Benefício" value={<Badge label="Incluso na mensalidade" variant="success" />} />
          ) : null}
        </Card>

        <Card>
          <Text variant="bodyStrong" style={{ marginBottom: spacing.sm }}>
            Sua participação
          </Text>
          {myParticipant ? (
            <View style={{ gap: spacing.sm }}>
              <EventConfirmationButtons groupId={groupId} eventId={event.id} participant={myParticipant} />
            </View>
          ) : (
            <Text variant="body" color="textSecondary">
              Você não foi convidado para este evento.
            </Text>
          )}
        </Card>

        {canManage ? (
          <Card>
            <Text variant="bodyStrong" style={{ marginBottom: spacing.md }}>
              Administração
            </Text>
            <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
              <Button
                label="Editar evento"
                variant="secondary"
                onPress={() => router.push({ pathname: '/events/[eventId]/edit', params: { eventId: event.id } })}
              />
              {nextTransition ? (
                <Button
                  label={nextTransition.label}
                  onPress={() => updateEventMutation.mutate({ status: nextTransition.status })}
                  loading={updateEventMutation.isPending}
                  disabled={updateEventMutation.isPending}
                />
              ) : null}
              {isCancellable ? (
                <Button
                  label="Cancelar evento"
                  variant="secondary"
                  onPress={confirmCancelEvent}
                  loading={updateEventMutation.isPending}
                  disabled={updateEventMutation.isPending}
                />
              ) : null}
              {updateEventMutation.isError ? (
                <Text variant="caption" color="danger" accessibilityRole="alert">
                  Não foi possível atualizar o evento. Tente novamente.
                </Text>
              ) : null}
            </View>

            <Text variant="bodyStrong" style={{ marginBottom: spacing.sm }}>
              Participantes ({participants?.length ?? 0})
            </Text>
            <EventParticipantsPanel participants={participants ?? []} members={members ?? []} currentUserId={me?.id} />
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
