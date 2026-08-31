import { View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { spacing } from '@/theme';
import { useRequestGuestParticipation } from '../hooks/useMatchParticipants';
import { getMatchParticipantErrorMessage } from '../utils/match-error-message';

export interface RequestParticipationCardProps {
  groupId: string;
  matchId: string;
  /** Whether the REGULAR pool (REGULAR + GUEST) is already at its snapshot capacity — see gestaofut-api docs/matches.md, "REGRA". */
  isFull: boolean;
}

/**
 * Self-service join entry point for an active GUEST group member who has no
 * `MatchParticipant` record yet on this OPEN match — "REGRA" (see
 * gestaofut-api docs/matches.md): the server always makes the real
 * CONFIRMED-vs-WAITLISTED call, so `isFull` here is only a client-side hint
 * for which copy/button label to show, never the authorization itself.
 */
export function RequestParticipationCard({ groupId, matchId, isFull }: RequestParticipationCardProps) {
  const mutation = useRequestGuestParticipation(groupId, matchId);

  return (
    <View style={{ gap: spacing.sm }}>
      {isFull ? <Text variant="body">Jogo lotado</Text> : null}
      <Button
        label={isFull ? 'Entrar na lista de espera' : 'Vou jogar'}
        variant="primary"
        onPress={() => mutation.mutate()}
        loading={mutation.isPending}
        disabled={mutation.isPending}
      />
      {mutation.error ? (
        <Text variant="caption" color="danger" accessibilityRole="alert">
          {getMatchParticipantErrorMessage(mutation.error)}
        </Text>
      ) : null}
    </View>
  );
}
