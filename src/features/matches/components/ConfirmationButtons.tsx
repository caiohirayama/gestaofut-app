import { View } from 'react-native';
import { Badge, Button, Text } from '@/components/ui';
import type { MatchParticipant } from '@/services/api/endpoints/matches';
import { spacing } from '@/theme';
import {
  useCancelMatchParticipant,
  useConfirmMatchParticipant,
  useDeclineMatchParticipant,
} from '../hooks/useMatchParticipants';
import { getMatchParticipantErrorMessage } from '../utils/match-error-message';
import { PARTICIPANT_ACTIONABLE_STATUSES } from '../utils/match-labels';

export interface ConfirmationButtonsProps {
  groupId: string;
  matchId: string;
  participant: MatchParticipant;
}

/**
 * "Vou jogar" / "Não vou" — the core confirmation flow. Renders differently
 * per current status because the API only allows specific transitions
 * (mirrors gestaofut-api's `ALLOWED_SOURCE_STATUSES`, see docs/matches.md
 * there): a `CONFIRMED` participant can only move to `CANCELLED` (the
 * `decline` action would be rejected with 409 from that state), and a
 * `DECLINED`/`CANCELLED` participant has no way back through this API —
 * showing a button that's known to fail would just be a bad UX dead end
 * (see gestaofut-app docs/state-management.md on hiding actions the
 * backend would reject anyway).
 *
 * Double submit is prevented by disabling *both* buttons while *any* of
 * the three mutations is in flight — not just the one that was pressed —
 * so a quick double-tap (or tapping the other button mid-request) can
 * never fire two competing requests for the same participant.
 */
export function ConfirmationButtons({ groupId, matchId, participant }: ConfirmationButtonsProps) {
  const confirmMutation = useConfirmMatchParticipant(groupId, matchId);
  const declineMutation = useDeclineMatchParticipant(groupId, matchId);
  const cancelMutation = useCancelMatchParticipant(groupId, matchId);

  const isPending =
    confirmMutation.isPending || declineMutation.isPending || cancelMutation.isPending;
  const error = confirmMutation.error ?? declineMutation.error ?? cancelMutation.error;

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
        {error ? (
          <Text variant="caption" color="danger" accessibilityRole="alert">
            {getMatchParticipantErrorMessage(error)}
          </Text>
        ) : null}
      </View>
    );
  }

  if (PARTICIPANT_ACTIONABLE_STATUSES.includes(participant.status)) {
    return (
      <View style={{ gap: spacing.sm }}>
        {participant.status === 'WAITLISTED' ? (
          <Text variant="caption" color="textSecondary">
            Você está na lista de espera — tentar confirmar pode funcionar se sobrar vaga.
          </Text>
        ) : null}
        <Button
          label="Vou jogar"
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
        {error ? (
          <Text variant="caption" color="danger" accessibilityRole="alert">
            {getMatchParticipantErrorMessage(error)}
          </Text>
        ) : null}
      </View>
    );
  }

  const informationalLabel =
    participant.status === 'DECLINED'
      ? 'Você recusou este jogo.'
      : participant.status === 'CANCELLED'
        ? 'Você cancelou sua presença neste jogo.'
        : participant.status === 'NO_SHOW'
          ? 'Você constou como ausente neste jogo.'
          : 'Sua presença já foi registrada.';

  return (
    <Text variant="body" color="textSecondary">
      {informationalLabel}
    </Text>
  );
}
