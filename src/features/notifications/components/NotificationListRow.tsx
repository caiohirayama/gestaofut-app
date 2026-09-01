import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { Card, Text } from '@/components/ui';
import type { AppNotification } from '@/services/api/endpoints/notifications';
import { colors, spacing } from '@/theme';
import { formatNotificationTimestamp } from '../utils/notification-datetime';
import { NOTIFICATION_TYPE_ICON, NOTIFICATION_TYPE_LABELS } from '../utils/notification-labels';

export interface NotificationListRowProps {
  notification: AppNotification;
  onPress: () => void;
}

/** Memoized, mirrors `MatchListRow`. Unread rows get a filled dot + bolder title; read rows are visually quieter. */
export const NotificationListRow = memo(function NotificationListRow({ notification, onPress }: NotificationListRowProps) {
  const isUnread = notification.readAt === null;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: isUnread }}>
      <Card>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isUnread ? colors.primarySoft : colors.neutralSoft,
            }}
          >
            <Ionicons
              name={NOTIFICATION_TYPE_ICON[notification.type]}
              size={18}
              color={isUnread ? colors.primary : colors.textTertiary}
            />
          </View>

          <View style={{ flex: 1, gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {isUnread ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} /> : null}
              <Text variant={isUnread ? 'bodyStrong' : 'body'} color={isUnread ? 'textPrimary' : 'textSecondary'}>
                {NOTIFICATION_TYPE_LABELS[notification.type]}
              </Text>
            </View>
            <Text variant="body" color="textSecondary" numberOfLines={2}>
              {notification.body}
            </Text>
            <Text variant="caption" color="textTertiary">
              {formatNotificationTimestamp(notification.createdAt)}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
});
