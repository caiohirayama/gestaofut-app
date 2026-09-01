import { router } from 'expo-router';
import { View } from 'react-native';
import { Badge, Card, Text } from '@/components/ui';
import { ConfirmationButtons } from '@/features/matches/components/ConfirmationButtons';
import { RequestParticipationCard } from '@/features/matches/components/RequestParticipationCard';
import { useMatchParticipants } from '@/features/matches/hooks/useMatchParticipants';
import { useMyMatchParticipant } from '@/features/matches/hooks/useMyMatchParticipant';
import { formatMatchWeekdayTime } from '@/features/matches/utils/match-datetime';
import { MATCH_STATUS_BADGE_VARIANT, MATCH_STATUS_LABELS } from '@/features/matches/utils/match-labels';
import type { DashboardNextMatch } from '@/services/api/endpoints/dashboard';
import { spacing } from '@/theme';
import { remainingSlots } from '../utils/vagas';

export interface MemberNextMatchCardProps {
  groupId: string;
  nextMatch: DashboardNextMatch | null;
}

function capacityLabel(confirmed: number, capacity: number | null): string {
  return capacity === null ? `${confirmed} confirmados` : `${confirmed} / ${capacity} confirmados`;
}

/**
 * "Próximo jogo" + "Minha confirmação" — the two highest MEMBER priorities
 * in one card. `nextMatch` (identity/capacity/status) comes from the
 * aggregated dashboard; the two queries here (`useMyMatchParticipant`,
 * `useMatchParticipants`) are scoped to that one match by id, sharing the
 * same cache entry — no full match-history fetch like the old
 * `NextMatchCard` needed.
 */
export function MemberNextMatchCard({ groupId, nextMatch }: MemberNextMatchCardProps) {
  const { data: myParticipant, myMember } = useMyMatchParticipant(groupId, nextMatch?.id);
  const { data: participants } = useMatchParticipants(groupId, nextMatch?.id);

  if (!nextMatch) {
    return (
      <Card>
        <Text variant="bodyStrong">Próximo jogo</Text>
        <Text variant="body" color="textSecondary" style={{ marginTop: spacing.sm }}>
          Nenhum jogo agendado.
        </Text>
      </Card>
    );
  }

  const isOpen = nextMatch.status === 'OPEN';
  const remaining = remainingSlots(nextMatch.regularCapacity, nextMatch.confirmed);

  return (
    <Card>
      <Text variant="label" color="primary">
        {formatMatchWeekdayTime(nextMatch.startsAt)}
      </Text>
      <Text variant="title" style={{ marginTop: spacing.xs }}>
        Próximo jogo
      </Text>
      {nextMatch.locationName ? (
        <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.xs }}>
          {nextMatch.locationName}
        </Text>
      ) : null}

      <View style={{ marginTop: spacing.md, marginBottom: spacing.lg }}>
        {nextMatch.status === 'OPEN' || nextMatch.status === 'CLOSED' || nextMatch.status === 'IN_PROGRESS' ? (
          <Text variant="bodyStrong">{capacityLabel(nextMatch.confirmed, nextMatch.regularCapacity)}</Text>
        ) : (
          <Badge label={MATCH_STATUS_LABELS[nextMatch.status]} variant={MATCH_STATUS_BADGE_VARIANT[nextMatch.status]} />
        )}
      </View>

      <Text variant="bodyStrong" style={{ marginBottom: spacing.sm }}>
        Minha confirmação
      </Text>
      {isOpen && myParticipant ? (
        <ConfirmationButtons groupId={groupId} matchId={nextMatch.id} participant={myParticipant} participants={participants ?? []} />
      ) : isOpen && !myParticipant && myMember?.membershipType === 'GUEST' && myMember.status === 'ACTIVE' ? (
        <RequestParticipationCard groupId={groupId} matchId={nextMatch.id} isFull={remaining === 0} />
      ) : (
        <Text variant="body" color="textSecondary">
          {myParticipant ? 'Confirmações encerradas para este jogo.' : 'Você não está na lista deste jogo.'}
        </Text>
      )}

      <Text
        variant="label"
        color="primary"
        style={{ marginTop: spacing.md, textAlign: 'center' }}
        onPress={() => router.push({ pathname: '/matches/[matchId]', params: { matchId: nextMatch.id } })}
        accessibilityRole="button"
      >
        Ver detalhes
      </Text>
    </Card>
  );
}
