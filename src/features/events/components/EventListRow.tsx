import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Card, Text } from '@/components/ui';
import type { Event } from '@/services/api/endpoints/events';
import { colors, spacing } from '@/theme';
import { formatEventDate } from '../utils/event-datetime';
import { EVENT_STATUS_BADGE_VARIANT, EVENT_STATUS_LABELS, EVENT_TYPE_EMOJI } from '../utils/event-labels';

export interface EventListRowProps {
  event: Event;
  onPress: () => void;
}

export const EventListRow = memo(function EventListRow({ event, onPress }: EventListRowProps) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text variant="bodyStrong">
              {EVENT_TYPE_EMOJI[event.type]} {event.title}
            </Text>
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {formatEventDate(event.startsAt)}
            </Text>
          </View>
          <Badge label={EVENT_STATUS_LABELS[event.status]} variant={EVENT_STATUS_BADGE_VARIANT[event.status]} />
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </View>
      </Card>
    </Pressable>
  );
});
