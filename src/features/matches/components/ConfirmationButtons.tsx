import { View } from 'react-native';
import { Badge, Button, Text } from '@/components/ui';
import type { MatchParticipant } from '@/services/api/endpoints/matches';
import { colors, radius, spacing } from '@/theme';
import { useCountdown } from '../hooks/useCountdown';
import {
  useCancelMatchParticipant,
  useConfirmMatchParticipant,
  useDeclineMatchParticipant,
} from '../hooks/useMatchParticipants';
import { getMatchParticipantErrorMessage } from '../utils/match-error-message';
import { PARTICIPANT_CONFIRMABLE_STATUSES } from '../utils/match-labels';
import { computeQueueRank } from '../utils/participant-summary';

export interface ConfirmationButtonsProps {
  groupId: string;
  matchId: string;
  participant: MatchParticipant;
  /** Full roster for this match — needed to compute the WAITLISTED "posição aproximada". */
  participants: MatchParticipant[];
}

/**
 * "Vou jogar" / "Não vou" plus the fila/oferta states — renders differently
 * per current status because the API only allows specific transitions
 * (mirrors gestaofut-api's `ALLOWED_SOURCE_STATUSES`, see docs/matches.md
 * there): a `CONFIRMED` participant can only move to `CANCELLED` (the
 * `decline` action would be rejected with 409 from that state), a
 * `WAITLISTED` participant can only leave the queue (`decline`) — confirming
 * directly from `WAITLISTED` is rejected with 409, since a slot must first
 * be *offered* — and a `DECLINED`/`CANCELLED` participant has no way back
 * through this API (see gestaofut-app docs/state-management.md on hiding
 * actions the backend would reject anyway).
 *
 * Double submit is prevented by disabling *both* buttons while *any* of the
 * three mutations is in flight — not just the one that was pressed — so a
 * quick double-tap (or tapping the other button mid-request) can never fire
 * two competing requests for the same participant.
 */
export function ConfirmationButtons({ groupId, matchId, participant, participants }: ConfirmationButtonsProps) {
  const confirmMutation = useConfirmMatchParticipant(groupId, matchId);
  const declineMutation = useDeclineMatchParticipant(groupId, matchId);
  const cancelMutation = useCancelMatchParticipant(groupId, matchId);
  const countdown = useCountdown(participant.status === 'OFFERED' ? participant.offerExpiresAt : null);

  const isPending =
    confirmMutation.isPending || declineMutation.isPending || cancelMutation.isPending;
  const error = confirmMutation.error ?? declineMutation.error ?? cancelMutation.error;

  const errorMessage = error ? (
    <Text variant="caption" color="danger" accessibilityRole="alert">
      {getMatchParticipantErrorMessage(error)}
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

  if (participant.status === 'WAITLISTED') {
    const rank = computeQueueRank(participants, participant);
    return (
      <View style={{ gap: spacing.sm }}>
        <Text variant="body">Você está na lista de espera.</Text>
        {rank !== null ? (
          <Text variant="caption" color="textSecondary">
            Posição aproximada: {rank}
          </Text>
        ) : null}
        <Button
          label="Sair da fila"
          variant="secondary"
          onPress={() => declineMutation.mutate(participant.id)}
          loading={declineMutation.isPending}
          disabled={isPending}
        />
        {errorMessage}
      </View>
    );
  }

  if (participant.status === 'OFFERED') {
    return (
      <View
        style={{
          gap: spacing.sm,
          padding: spacing.md,
          backgroundColor: colors.warningSoft,
          borderRadius: radius.md,
        }}
      >
        <Text variant="bodyStrong">⚽ Uma vaga abriu para você.</Text>
        <Text variant="body" color="warning">
          {countdown.isExpired
            ? 'A oferta expirou — aguarde a próxima.'
            : `Você tem ${countdown.formatted} para confirmar.`}
        </Text>
        <Button
          label="ACEITAR VAGA"
          variant="primary"
          onPress={() => confirmMutation.mutate(participant.id)}
          loading={confirmMutation.isPending}
          disabled={isPending || countdown.isExpired}
        />
        <Button
          label="RECUSAR"
          variant="secondary"
          onPress={() => declineMutation.mutate(participant.id)}
          loading={declineMutation.isPending}
          disabled={isPending}
        />
        {errorMessage}
      </View>
    );
  }

  if (PARTICIPANT_CONFIRMABLE_STATUSES.includes(participant.status)) {
    return (
      <View style={{ gap: spacing.sm }}>
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
        {errorMessage}
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
