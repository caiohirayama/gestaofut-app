import { View } from 'react-native';
import { Badge, Button, Text } from '@/components/ui';
import type { EventParticipant } from '@/services/api/endpoints/events';
import { spacing } from '@/theme';
import {
  useCancelEventParticipant,
  useConfirmEventParticipant,
  useDeclineEventParticipant,
} from '../hooks/useEventParticipants';
import { getEventParticipantErrorMessage } from '../utils/event-error-message';

export interface EventConfirmationButtonsProps {
  groupId: string;
  eventId: string;
  participant: EventParticipant;
}

/**
 * "CONFIRMAÇÃO: Vou / Não vou" — simpler than matches' `ConfirmationButtons`
 * (no waitlist/offer states): `INVITED` can move to `CONFIRMED` or
 * `DECLINED`; a `CONFIRMED` participant can back out via "Não vou mais"
 * (→ `CANCELLED`). `ATTENDED`/`NO_SHOW` are admin-only transitions and never
 * reachable from here. Double submit is prevented by disabling every button
 * while any of the three mutations is in flight.
 */
export function EventConfirmationButtons({ groupId, eventId, participant }: EventConfirmationButtonsProps) {
  const confirmMutation = useConfirmEventParticipant(groupId, eventId);
  const declineMutation = useDeclineEventParticipant(groupId, eventId);
  const cancelMutation = useCancelEventParticipant(groupId, eventId);

  const isPending = confirmMutation.isPending || declineMutation.isPending || cancelMutation.isPending;
  const error = confirmMutation.error ?? declineMutation.error ?? cancelMutation.error;

  const errorMessage = error ? (
    <Text variant="caption" color="danger" accessibilityRole="alert">
      {getEventParticipantErrorMessage(error)}
    </Text>
  ) : null;

  if (participant.status === 'CONFIRMED') {
    return (
      <View style={{ gap: spacing.sm }}>
        <Badge label="Presença confirmada" variant="success" />
        <Button
          label="Não vou mais"
          variant="secondary"
          onPress={() => cancelMutation.mutate(participant.id)}
          loading={cancelMutation.isPending}
          disabled={isPending}
        />
        {errorMessage}
      </View>
    );
  }

  if (participant.status === 'INVITED') {
    return (
      <View style={{ gap: spacing.sm }}>
        <Button
          label="Vou"
          variant="primary"
          onPress={() => confirmMutation.mutate(participant.id)}
          loading={confirmMutation.isPending}
          disabled={isPending}
        />
        <Button
          label="Não vou"
          variant="secondary"
          onPress={() => declineMutation.mutate(participant.id)}
          loading={declineMutation.isPending}
          disabled={isPending}
        />
        {errorMessage}
      </View>
    );
  }

  const informationalLabel =
    participant.status === 'DECLINED'
      ? 'Você não vai a este evento.'
      : participant.status === 'CANCELLED'
        ? 'Você cancelou sua presença neste evento.'
        : participant.status === 'NO_SHOW'
          ? 'Você constou como ausente neste evento.'
          : 'Sua presença já foi registrada.';

  return (
    <Text variant="body" color="textSecondary">
      {informationalLabel}
    </Text>
  );
}
