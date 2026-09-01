import { router } from 'expo-router';
import { View } from 'react-native';
import { Badge, Card, Text } from '@/components/ui';
import { EventConfirmationButtons } from '@/features/events/components/EventConfirmationButtons';
import { useMyEventEntitlement } from '@/features/events/hooks/useMyEventEntitlement';
import { useMyEventParticipant } from '@/features/events/hooks/useMyEventParticipant';
import { formatEventDate } from '@/features/events/utils/event-datetime';
import { EVENT_TYPE_EMOJI } from '@/features/events/utils/event-labels';
import type { DashboardNextEvent } from '@/services/api/endpoints/dashboard';
import { spacing } from '@/theme';

export interface MemberNextEventCardProps {
  groupId: string;
  nextEvent: DashboardNextEvent | null;
}

/** "Próximo evento" — the MEMBER priority list's lowest-priority item, so it renders nothing at all when there's none (mirrors `NextEventCard`'s own convention), rather than an empty-state card competing with jogo/mensalidade for attention. */
export function MemberNextEventCard({ groupId, nextEvent }: MemberNextEventCardProps) {
  const { data: myParticipant } = useMyEventParticipant(groupId, nextEvent?.id);
  const { data: entitlement } = useMyEventEntitlement(groupId, nextEvent?.id);

  if (!nextEvent) {
    return null;
  }

  return (
    <Card>
      <Text variant="bodyStrong">
        {EVENT_TYPE_EMOJI[nextEvent.type]} {nextEvent.title}
      </Text>
      <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.xs }}>
        {formatEventDate(nextEvent.startsAt)}
      </Text>
      {entitlement ? (
        <View style={{ marginTop: spacing.sm }}>
          <Badge label="Incluso na mensalidade" variant="success" />
        </View>
      ) : null}
      {myParticipant ? (
        <View style={{ marginTop: spacing.md }}>
          <EventConfirmationButtons groupId={groupId} eventId={nextEvent.id} participant={myParticipant} />
        </View>
      ) : null}
      <Text
        variant="label"
        color="primary"
        style={{ marginTop: spacing.md, textAlign: 'center' }}
        onPress={() => router.push({ pathname: '/events/[eventId]', params: { eventId: nextEvent.id } })}
        accessibilityRole="button"
      >
        Ver detalhes
      </Text>
    </Card>
  );
}
