import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Badge, Button, Card, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { InfoRow } from '@/components/common/InfoRow';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { useActiveGroupPermissions } from '@/features/groups/hooks/useActiveGroupPermissions';
import { useGroupMembers } from '@/features/groups/hooks/useGroupMembers';
import { getApiErrorMessage } from '@/services/api/error-message';
import { useGroupStore } from '@/store/group-store';
import { spacing } from '@/theme';
import { ConfirmationButtons } from '../components/ConfirmationButtons';
import { ParticipantsAdminPanel } from '../components/ParticipantsAdminPanel';
import { RequestParticipationCard } from '../components/RequestParticipationCard';
import { useMatch, useOpenMatch } from '../hooks/useMatches';
import { useMatchParticipants } from '../hooks/useMatchParticipants';
import { useMyMatchParticipant } from '../hooks/useMyMatchParticipant';
import { formatMatchDate, formatMatchTime } from '../utils/match-datetime';
import {
  MATCH_STATUS_BADGE_VARIANT,
  MATCH_STATUS_LABELS,
  PARTICIPANT_STATUS_BADGE_VARIANT,
  PARTICIPANT_STATUS_LABELS,
} from '../utils/match-labels';
import {
  summarizeGoalkeeperCapacity,
  summarizeRegularCapacity,
} from '../utils/participant-summary';

function capacityLabel(confirmed: number, capacity: number | null): string {
  return capacity === null ? `${confirmed} confirmados` : `${confirmed} / ${capacity} confirmados`;
}

/**
 * "MATCH DETAILS": data, horário, local, capacidade, confirmados, goleiros
 * e o status do próprio usuário — mais a confirmação em si (reaproveitando
 * `ConfirmationButtons`, o mesmo componente do card de destaque da Home) e,
 * quando autorizado (`match.manage`), o roster administrativo completo. Ver
 * docs/matches.md.
 */
export function MatchDetailsScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const groupId = useGroupStore((state) => state.activeGroupId);
  const { data: match, isPending, isError, refetch } = useMatch(groupId ?? undefined, matchId);
  const { data: participants } = useMatchParticipants(groupId ?? undefined, matchId);
  const { data: members } = useGroupMembers(groupId ?? undefined);
  const { data: me } = useCurrentUser();
  const { data: myParticipant, myMember } = useMyMatchParticipant(groupId ?? undefined, matchId);
  const { can } = useActiveGroupPermissions();
  const canManage = can('match.manage');
  const openMutation = useOpenMatch(groupId ?? '', matchId ?? '');

  if (isPending) {
    return (
      <Screen>
        <LoadingState label="Carregando jogo..." />
      </Screen>
    );
  }

  if (isError || !match || !groupId) {
    return (
      <Screen>
        <ErrorState title="Jogo não encontrado" onRetry={refetch} />
      </Screen>
    );
  }

  const regularSummary = summarizeRegularCapacity(participants ?? [], match.regularCapacity);
  const goalkeeperSummary = summarizeGoalkeeperCapacity(
    participants ?? [],
    match.goalkeeperCapacity,
  );

  return (
    <Screen scroll>
      <View style={{ marginTop: spacing.xxl, marginBottom: spacing.lg, gap: spacing.xs }}>
        <Badge
          label={MATCH_STATUS_LABELS[match.status]}
          variant={MATCH_STATUS_BADGE_VARIANT[match.status]}
        />
        <Text variant="title">{formatMatchDate(match.startsAt)}</Text>
        <Text variant="body" color="textSecondary">
          {formatMatchTime(match.startsAt)} – {formatMatchTime(match.endsAt)}
        </Text>
      </View>

      <View style={{ gap: spacing.lg }}>
        <Card>
          <Text variant="bodyStrong" style={{ marginBottom: spacing.sm }}>
            Informações
          </Text>
          <InfoRow label="Local" value={match.locationName ?? 'A definir'} />
          {match.locationAddress ? (
            <InfoRow label="Endereço" value={match.locationAddress} />
          ) : null}
          <InfoRow
            label="Vagas de linha"
            value={capacityLabel(regularSummary.confirmed, regularSummary.capacity)}
          />
          <InfoRow
            label="Vagas de goleiro"
            value={capacityLabel(goalkeeperSummary.confirmed, goalkeeperSummary.capacity)}
          />
        </Card>

        <Card>
          <Text variant="bodyStrong" style={{ marginBottom: spacing.sm }}>
            Sua participação
          </Text>
          {myParticipant ? (
            <View style={{ gap: spacing.sm }}>
              <Badge
                label={PARTICIPANT_STATUS_LABELS[myParticipant.status]}
                variant={PARTICIPANT_STATUS_BADGE_VARIANT[myParticipant.status]}
              />
              {match.status === 'OPEN' ? (
                <ConfirmationButtons
                  groupId={groupId}
                  matchId={match.id}
                  participant={myParticipant}
                  participants={participants ?? []}
                />
              ) : null}
            </View>
          ) : match.status === 'OPEN' && myMember?.membershipType === 'GUEST' && myMember.status === 'ACTIVE' ? (
            <RequestParticipationCard
              groupId={groupId}
              matchId={match.id}
              isFull={regularSummary.capacity !== null && regularSummary.confirmed >= regularSummary.capacity}
            />
          ) : (
            <Text variant="body" color="textSecondary">
              Você não está na lista deste jogo.
            </Text>
          )}
        </Card>

        {canManage ? (
          <Card>
            <Text variant="bodyStrong" style={{ marginBottom: spacing.md }}>
              Administração
            </Text>
            {match.status === 'SCHEDULED' ? (
              <View style={{ marginBottom: spacing.md, gap: spacing.sm }}>
                <Text variant="caption" color="textSecondary">
                  O jogo ainda não está aberto para confirmações.
                </Text>
                <Button
                  label="Abrir jogo"
                  onPress={() => openMutation.mutate()}
                  loading={openMutation.isPending}
                  disabled={openMutation.isPending}
                />
                {openMutation.isError ? (
                  <Text variant="caption" color="danger" accessibilityRole="alert">
                    {getApiErrorMessage(openMutation.error)}
                  </Text>
                ) : null}
              </View>
            ) : null}
            <ParticipantsAdminPanel
              participants={participants ?? []}
              members={members ?? []}
              currentUserId={me?.id}
            />
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
