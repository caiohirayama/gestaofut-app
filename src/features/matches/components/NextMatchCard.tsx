import { router } from 'expo-router';
import { View } from 'react-native';
import { Badge, Card, EmptyState, LoadingState, Text } from '@/components/ui';
import { useGroup } from '@/features/groups/hooks/useGroup';
import { spacing } from '@/theme';
import { ConfirmationButtons } from './ConfirmationButtons';
import { useMatchParticipants } from '../hooks/useMatchParticipants';
import { useMyMatchParticipant } from '../hooks/useMyMatchParticipant';
import { useNextMatch } from '../hooks/useNextMatch';
import { formatMatchWeekdayTime } from '../utils/match-datetime';
import { MATCH_STATUS_BADGE_VARIANT, MATCH_STATUS_LABELS } from '../utils/match-labels';
import { summarizeRegularCapacity } from '../utils/participant-summary';

function capacityLabel(confirmed: number, capacity: number | null): string {
  return capacity === null ? `${confirmed} confirmados` : `${confirmed} / ${capacity} confirmados`;
}

/**
 * The Home screen's centerpiece — "mostrar próximo jogo em destaque". The
 * player should be able to confirm presence right here, without navigating
 * anywhere else first (see docs/matches.md, UX). "Ver detalhes" is offered
 * as a secondary, optional path to `MatchDetailsScreen` for anything this
 * compact card doesn't show (location, goalkeepers, admin roster).
 */
export function NextMatchCard({ groupId }: { groupId: string }) {
  const { data: match, isPending, isError } = useNextMatch(groupId);
  const { data: group } = useGroup(groupId);
  const { data: participants } = useMatchParticipants(groupId, match?.id);
  const { data: myParticipant } = useMyMatchParticipant(groupId, match?.id);

  if (isPending) {
    return (
      <Card>
        <LoadingState label="Carregando próximo jogo..." />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <Text variant="body" color="danger">
          Não foi possível carregar o próximo jogo.
        </Text>
      </Card>
    );
  }

  if (!match) {
    return (
      <Card>
        <EmptyState
          title="Nenhum jogo agendado"
          message="Quando um jogo for criado, ele aparece aqui."
        />
      </Card>
    );
  }

  const isOpen = match.status === 'OPEN';
  const regularSummary = summarizeRegularCapacity(participants ?? [], match.regularCapacity);

  return (
    <Card>
      <View style={{ gap: spacing.xs }}>
        <Text variant="label" color="primary">
          {formatMatchWeekdayTime(match.startsAt)}
        </Text>
        <Text variant="title">{group?.name ?? 'Jogo'}</Text>
        {match.locationName ? (
          <Text variant="caption" color="textSecondary">
            {match.locationName}
          </Text>
        ) : null}
      </View>

      <View style={{ marginTop: spacing.md, marginBottom: spacing.lg }}>
        {isOpen || match.status === 'CLOSED' || match.status === 'IN_PROGRESS' ? (
          <Text variant="bodyStrong">
            {capacityLabel(regularSummary.confirmed, regularSummary.capacity)}
          </Text>
        ) : (
          <Badge
            label={MATCH_STATUS_LABELS[match.status]}
            variant={MATCH_STATUS_BADGE_VARIANT[match.status]}
          />
        )}
      </View>

      {isOpen && myParticipant ? (
        <ConfirmationButtons groupId={groupId} matchId={match.id} participant={myParticipant} />
      ) : null}

      <Text
        variant="label"
        color="primary"
        style={{ marginTop: spacing.md, textAlign: 'center' }}
        onPress={() => router.push({ pathname: '/match/[matchId]', params: { matchId: match.id } })}
        accessibilityRole="button"
      >
        Ver detalhes
      </Text>
    </Card>
  );
}
