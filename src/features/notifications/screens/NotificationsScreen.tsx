import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, View, type ListRenderItemInfo } from 'react-native';
import { EmptyState, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { ChipSelect } from '@/features/groups/components/ChipSelect';
import type { AppNotification } from '@/services/api/endpoints/notifications';
import { spacing } from '@/theme';
import { NotificationListRow } from '../components/NotificationListRow';
import { NotificationPermissionBanner } from '../components/NotificationPermissionBanner';
import { useMarkNotificationRead } from '../hooks/useMarkNotificationRead';
import { useNotifications } from '../hooks/useNotifications';
import { usePushPermission } from '../hooks/usePushPermission';
import { useRegisterPushDevice } from '../hooks/useRegisterPushDevice';
import { resolveNotificationDeepLink } from '../utils/notification-deep-link';
import { readNotifications, unreadNotifications } from '../utils/notification-lists';

type NotificationsTab = 'UNREAD' | 'READ';

const TAB_OPTIONS: { value: NotificationsTab; label: string }[] = [
  { value: 'UNREAD', label: 'Não lidas' },
  { value: 'READ', label: 'Lidas' },
];

/**
 * "NOTIFICATION CENTER": não lidas / lidas / marcar como lida — one fetch,
 * partitioned client-side (`unreadNotifications`/`readNotifications`),
 * same pattern as `GamesScreen`'s upcoming/history split. Tapping a row
 * marks it read (a no-op if it already is) and, when the notification
 * points somewhere more specific than this screen itself, deep-links there
 * ("DEEP LINKS" — the exact same resolution a tapped push uses, see
 * `resolveNotificationDeepLink`).
 */
export function NotificationsScreen() {
  const { data: notifications, isPending, isError, refetch } = useNotifications();
  const [tab, setTab] = useState<NotificationsTab>('UNREAD');
  const markReadMutation = useMarkNotificationRead();
  const permission = usePushPermission();
  const registerDevice = useRegisterPushDevice();

  const list = useMemo(() => {
    if (!notifications) return [];
    return tab === 'UNREAD' ? unreadNotifications(notifications) : readNotifications(notifications);
  }, [notifications, tab]);

  const handlePressNotification = useCallback(
    (notification: AppNotification) => {
      if (notification.readAt === null) {
        markReadMutation.mutate(notification.id);
      }
      const href = resolveNotificationDeepLink(notification.data);
      if (href !== '/notifications') {
        router.push(href);
      }
    },
    [markReadMutation],
  );

  const handleRequestPermission = useCallback(async () => {
    const status = await permission.request();
    if (status === 'granted') {
      await registerDevice.register();
    }
  }, [permission, registerDevice]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<AppNotification>) => (
      <NotificationListRow notification={item} onPress={() => handlePressNotification(item)} />
    ),
    [handlePressNotification],
  );

  if (isPending) {
    return (
      <Screen>
        <LoadingState label="Carregando notificações..." />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={list}
        keyExtractor={(notification) => notification.id}
        renderItem={renderItem}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl }}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
            <Text variant="title">Notificações</Text>
            {permission.status === 'loading' ? null : (
              <NotificationPermissionBanner
                status={permission.status}
                onRequest={handleRequestPermission}
                isRequesting={registerDevice.stage === 'registering'}
                onRevoke={() => void registerDevice.revoke()}
                isRevoking={registerDevice.isRevoking}
              />
            )}
            <ChipSelect options={TAB_OPTIONS} value={tab} onChange={setTab} />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={tab === 'UNREAD' ? 'Nenhuma notificação nova' : 'Nenhuma notificação lida ainda'}
            message={tab === 'UNREAD' ? 'Você está em dia — volte aqui depois.' : undefined}
          />
        }
      />
    </Screen>
  );
}
