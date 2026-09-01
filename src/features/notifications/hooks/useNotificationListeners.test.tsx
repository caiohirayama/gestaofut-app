import { renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { queryClient } from '@/services/api/query-client';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationListeners } from './useNotificationListeners';

function fakeNotification(data: Record<string, unknown> | null) {
  return { request: { content: { data } } } as Notifications.Notification;
}

describe('useNotificationListeners — DEEP LINKS / FOREGROUND', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
    jest.spyOn(router, 'push').mockImplementation(() => {});
    jest.spyOn(Notifications, 'getLastNotificationResponseAsync').mockResolvedValue(null);
  });

  it('deep-links to the resolved route when a notification is tapped', () => {
    let responseHandler!: (response: Notifications.NotificationResponse) => void;
    jest.spyOn(Notifications, 'addNotificationResponseReceivedListener').mockImplementation((handler) => {
      responseHandler = handler;
      return { remove: jest.fn() } as unknown as Notifications.EventSubscription;
    });

    renderHook(() => useNotificationListeners());
    responseHandler({ notification: fakeNotification({ matchId: 'match-1' }) } as Notifications.NotificationResponse);

    expect(router.push).toHaveBeenCalledWith({ pathname: '/matches/[matchId]', params: { matchId: 'match-1' } });
  });

  it('never navigates for a tap while the session is unauthenticated (a stale token left on the device)', () => {
    useAuthStore.setState({ status: 'unauthenticated', accessToken: null });
    let responseHandler!: (response: Notifications.NotificationResponse) => void;
    jest.spyOn(Notifications, 'addNotificationResponseReceivedListener').mockImplementation((handler) => {
      responseHandler = handler;
      return { remove: jest.fn() } as unknown as Notifications.EventSubscription;
    });

    renderHook(() => useNotificationListeners());
    responseHandler({ notification: fakeNotification({ matchId: 'match-1' }) } as Notifications.NotificationResponse);

    expect(router.push).not.toHaveBeenCalled();
  });

  it('COLD START: deep-links from getLastNotificationResponseAsync when the app was launched by tapping one', async () => {
    jest.spyOn(Notifications, 'getLastNotificationResponseAsync').mockResolvedValue({
      notification: fakeNotification({ eventId: 'event-1' }),
    } as Notifications.NotificationResponse);

    renderHook(() => useNotificationListeners());
    await Promise.resolve();
    await Promise.resolve();

    expect(router.push).toHaveBeenCalledWith({ pathname: '/events/[eventId]', params: { eventId: 'event-1' } });
  });

  it('does nothing on cold start when the app was opened normally (no notification response)', async () => {
    jest.spyOn(Notifications, 'getLastNotificationResponseAsync').mockResolvedValue(null);

    renderHook(() => useNotificationListeners());
    await Promise.resolve();
    await Promise.resolve();

    expect(router.push).not.toHaveBeenCalled();
  });

  it('FOREGROUND: invalidates the notifications cache when one is received while the app is open', () => {
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    let receivedHandler!: (notification: Notifications.Notification) => void;
    jest.spyOn(Notifications, 'addNotificationReceivedListener').mockImplementation((handler) => {
      receivedHandler = handler;
      return { remove: jest.fn() } as unknown as Notifications.EventSubscription;
    });

    renderHook(() => useNotificationListeners());
    receivedHandler(fakeNotification({ matchId: 'match-1' }));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications'] });
  });

  it('removes both subscriptions on unmount', () => {
    const removeReceived = jest.fn();
    const removeResponse = jest.fn();
    jest.spyOn(Notifications, 'addNotificationReceivedListener').mockReturnValue({ remove: removeReceived } as unknown as Notifications.EventSubscription);
    jest.spyOn(Notifications, 'addNotificationResponseReceivedListener').mockReturnValue({ remove: removeResponse } as unknown as Notifications.EventSubscription);

    const { unmount } = renderHook(() => useNotificationListeners());
    unmount();

    expect(removeReceived).toHaveBeenCalledTimes(1);
    expect(removeResponse).toHaveBeenCalledTimes(1);
  });
});
