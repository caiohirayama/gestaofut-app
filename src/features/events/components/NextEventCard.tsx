import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Card, LoadingState, Text } from '@/components/ui';
import { spacing } from '@/theme';
import { useEventParticipants } from '../hooks/useEventParticipants';
import { useEvents } from '../hooks/useEvents';
import { formatEventShortDate } from '../utils/event-datetime';
import { EVENT_TYPE_EMOJI } from '../utils/event-labels';
import { pickNextEvent } from '../utils/event-lists';
import { countConfirmedParticipants } from '../utils/event-summary';

/**
 * "HOME: quando houver evento próximo" — renders nothing at all (not even
 * an empty state) when there is none, since unlike the match highlight this
 * is an optional secondary card, not the screen's centerpiece.
 */
export function NextEventCard({ groupId }: { groupId: string }) {
  const { data: events, isPending, isError } = useEvents(groupId);
  const nextEvent = pickNextEvent(events ?? []);
  const { data: participants, isPending: isParticipantsPending } = useEventParticipants(groupId, nextEvent?.id);

  if (isPending) {
    return (
      <Card>
        <LoadingState label="Carregando eventos..." />
      </Card>
    );
  }

  if (isError || !nextEvent) {
    return null;
  }

  const confirmed = countConfirmedParticipants(participants ?? []);

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/events/[eventId]', params: { eventId: nextEvent.id } })}
      >
        <Text variant="title">
          {EVENT_TYPE_EMOJI[nextEvent.type]} {nextEvent.title}
        </Text>
        <View style={{ marginTop: spacing.xs, flexDirection: 'row', gap: spacing.md }}>
          <Text variant="body" color="textSecondary">
            {formatEventShortDate(nextEvent.startsAt)}
          </Text>
          <Text variant="body" color="textSecondary">
            {isParticipantsPending ? '...' : `${confirmed} confirmados`}
          </Text>
        </View>
      </Pressable>
    </Card>
  );
}
