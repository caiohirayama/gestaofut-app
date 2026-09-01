import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as notificationsEndpoints from '@/services/api/endpoints/notifications';
import { useAuthStore } from '@/store/auth-store';
import * as pushPermissionModule from '../utils/push-permission';
import { NotificationsScreen } from './NotificationsScreen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

function notification(overrides: Partial<notificationsEndpoints.AppNotification> = {}): notificationsEndpoints.AppNotification {
  return {
    id: 'notification-1',
    userId: 'user-1',
    groupId: 'group-1',
    type: 'MATCH_OPENED',
    title: 'Um jogo foi aberto',
    body: 'Você entrou na fila de espera.',
    data: null,
    readAt: null,
    createdAt: '2026-03-01T12:00:00.000Z',
    ...overrides,
  };
}

function renderScreen(notifications: notificationsEndpoints.AppNotification[]) {
  useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  jest.spyOn(notificationsEndpoints, 'listNotifications').mockResolvedValue({ notifications });
  jest.spyOn(pushPermissionModule, 'getPushPermissionStatus').mockResolvedValue('granted');

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationsScreen />
    </QueryClientProvider>,
  );
}

describe('NotificationsScreen — NOTIFICATION CENTER', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('shows unread notifications by default', async () => {
    renderScreen([notification({ id: '1', readAt: null, body: 'não lida' }), notification({ id: '2', readAt: '2026-03-01T13:00:00.000Z', body: 'lida' })]);

    expect(await screen.findByText('não lida')).toBeTruthy();
    expect(screen.queryByText('lida')).toBeNull();
  });

  it('switching to "Lidas" shows read notifications instead', async () => {
    renderScreen([notification({ id: '1', readAt: null, body: 'não lida' }), notification({ id: '2', readAt: '2026-03-01T13:00:00.000Z', body: 'lida' })]);
    await screen.findByText('não lida');

    fireEvent.press(screen.getByText('Lidas'));

    expect(await screen.findByText('lida')).toBeTruthy();
    expect(screen.queryByText('não lida')).toBeNull();
  });

  it('shows an empty state when there are no unread notifications', async () => {
    renderScreen([]);

    expect(await screen.findByText('Nenhuma notificação nova')).toBeTruthy();
  });

  it('MARCAR COMO LIDA + DEEP LINK: tapping an unread row marks it read and deep-links to its resource', async () => {
    const markReadSpy = jest.spyOn(notificationsEndpoints, 'markNotificationRead').mockResolvedValue(
      notification({ id: '1', readAt: '2026-03-01T14:00:00.000Z', data: { matchId: 'match-1' } }),
    );
    renderScreen([notification({ id: '1', readAt: null, data: { matchId: 'match-1' }, body: 'Uma vaga abriu' })]);
    const row = await screen.findByText('Uma vaga abriu');

    fireEvent.press(row);

    await waitFor(() => expect(markReadSpy).toHaveBeenCalledWith('1'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/matches/[matchId]', params: { matchId: 'match-1' } });
  });

  it('does not navigate when the notification has no deep-linkable resource (data-less)', async () => {
    jest.spyOn(notificationsEndpoints, 'markNotificationRead').mockResolvedValue(notification({ id: '1', readAt: '2026-03-01T14:00:00.000Z', data: null }));
    renderScreen([notification({ id: '1', readAt: null, data: null, body: 'sem link' })]);
    const row = await screen.findByText('sem link');

    fireEvent.press(row);

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('tapping an already-read row navigates without calling markNotificationRead again', async () => {
    const markReadSpy = jest.spyOn(notificationsEndpoints, 'markNotificationRead');
    renderScreen([notification({ id: '1', readAt: '2026-03-01T13:00:00.000Z', data: { eventId: 'event-1' }, body: 'já lida' })]);
    fireEvent.press(await screen.findByText('Lidas'));
    const row = await screen.findByText('já lida');

    fireEvent.press(row);

    expect(markReadSpy).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/events/[eventId]', params: { eventId: 'event-1' } });
  });

  describe('PERMISSION banner', () => {
    it('shows the "ativar" prompt when permission is undetermined, never on first render before this screen exists', async () => {
      useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
      jest.spyOn(notificationsEndpoints, 'listNotifications').mockResolvedValue({ notifications: [] });
      jest.spyOn(pushPermissionModule, 'getPushPermissionStatus').mockResolvedValue('undetermined');
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      render(
        <QueryClientProvider client={queryClient}>
          <NotificationsScreen />
        </QueryClientProvider>,
      );

      expect(await screen.findByText('Ative as notificações')).toBeTruthy();
    });

    it('hides the "ativar" prompt once permission is granted, showing the revoke row instead', async () => {
      renderScreen([]);

      expect(await screen.findByText('Notificações por push ativadas')).toBeTruthy();
      expect(screen.queryByText('Ative as notificações')).toBeNull();
    });
  });
});
