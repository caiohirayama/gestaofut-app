import { router } from 'expo-router';
import { View } from 'react-native';
import { Badge, Button, Card, Text } from '@/components/ui';
import { formatMatchTime } from '@/features/matches/utils/match-datetime';
import type { DashboardNextMatch } from '@/services/api/endpoints/dashboard';
import { spacing } from '@/theme';
import { formatWeekdayShortDate, isSameLocalDay } from '../utils/home-datetime';
import { remainingSlots } from '../utils/vagas';

export interface AdminNextMatchCardProps {
  nextMatch: DashboardNextMatch | null;
}

/**
 * The admin's hero card — "jogo; vagas; espera" all in one place, the
 * three priorities an admin needs "entender em segundos". Deliberately no
 * per-player roster here (that's what "Ver escala" is for) — this card
 * only answers "is there a game, is there room, is anyone waiting".
 */
export function AdminNextMatchCard({ nextMatch }: AdminNextMatchCardProps) {
  if (!nextMatch) {
    return (
      <Card>
        <Text variant="bodyStrong">Nenhum jogo agendado</Text>
        <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.xs }}>
          Quando um jogo for criado, ele aparece aqui.
        </Text>
      </Card>
    );
  }

  const remaining = remainingSlots(nextMatch.regularCapacity, nextMatch.confirmed);

  return (
    <Card>
      <Text variant="label" color="textSecondary">
        {formatWeekdayShortDate(nextMatch.startsAt)}
      </Text>
      <Text variant="title" style={{ marginTop: spacing.xs }}>
        {isSameLocalDay(nextMatch.startsAt) ? '⚽ Jogo de hoje' : '⚽ Próximo jogo'}
      </Text>
      <Text variant="subtitle" color="primary" style={{ marginTop: spacing.xs }}>
        {formatMatchTime(nextMatch.startsAt)}
      </Text>
      {nextMatch.locationName ? (
        <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.xs }}>
          {nextMatch.locationName}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: spacing.lg,
        }}
      >
        <Text variant="title">
          {nextMatch.confirmed} / {nextMatch.regularCapacity ?? '∞'}
        </Text>
        {remaining === null ? (
          <Badge label="Sem limite" variant="neutral" />
        ) : remaining === 0 ? (
          <Badge label="Lotado" variant="warning" />
        ) : (
          <Badge label={`${remaining} vaga${remaining === 1 ? '' : 's'}`} variant="success" />
        )}
      </View>

      {nextMatch.waitlisted > 0 ? (
        <Text variant="caption" color="warning" style={{ marginTop: spacing.xs }}>
          {nextMatch.waitlisted} na fila de espera
        </Text>
      ) : null}

      <View style={{ marginTop: spacing.lg }}>
        <Button
          label="Ver escala"
          variant="secondary"
          onPress={() => router.push({ pathname: '/matches/[matchId]', params: { matchId: nextMatch.id } })}
        />
      </View>
    </Card>
  );
}
