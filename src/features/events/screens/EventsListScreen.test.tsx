import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as authEndpoints from '@/services/api/endpoints/auth';
import * as eventEndpoints from '@/services/api/endpoints/events';
import * as organizationEndpoints from '@/services/api/endpoints/organizations';
import { useAuthStore } from '@/store/auth-store';
import { useGroupStore } from '@/store/group-store';
import { EventsListScreen } from './EventsListScreen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

const me = { id: 'me-id', name: 'Ada', email: 'ada@example.com', phone: null, status: 'ACTIVE' as const, createdAt: '', updatedAt: '' };

function org() {
  return { id: 'org-1', name: 'Org', slug: 'org', status: 'ACTIVE' as const, createdAt: '', updatedAt: '' };
}

function event(overrides: Partial<eventEndpoints.Event> = {}): eventEndpoints.Event {
  return {
    id: 'event-1',
    groupId: 'group-1',
    type: 'BARBECUE',
    title: 'Churrasco de Agosto',
    description: null,
    startsAt: '2026-08-12T18:00:00.000Z',
    endsAt: '2026-08-12T22:00:00.000Z',
    locationName: null,
    status: 'OPEN',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function renderScreen(role: 'MEMBER' | 'ORGANIZER' | 'ADMIN', events: eventEndpoints.Event[]) {
  useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  useGroupStore.setState({ activeGroupId: 'group-1', activeOrganizationId: 'org-1' });
  jest.spyOn(authEndpoints, 'getMe').mockResolvedValue(me);
  jest.spyOn(organizationEndpoints, 'listOrganizations').mockResolvedValue({ organizations: [org()] });
  jest
    .spyOn(organizationEndpoints, 'listOrganizationMembers')
    .mockResolvedValue({ members: [{ organizationId: 'org-1', userId: me.id, role, status: 'ACTIVE', joinedAt: '' }] });
  jest.spyOn(eventEndpoints, 'listEvents').mockResolvedValue({ events });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EventsListScreen />
    </QueryClientProvider>,
  );
}

describe('EventsListScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('lists upcoming events by default', async () => {
    renderScreen('MEMBER', [event({ id: 'upcoming', status: 'OPEN' }), event({ id: 'past', status: 'FINISHED' })]);

    expect(await screen.findByText('🔥 Churrasco de Agosto')).toBeTruthy();
  });

  it('switching to "Histórico" shows finished/cancelled events instead', async () => {
    renderScreen('MEMBER', [
      event({ id: 'upcoming', status: 'OPEN', title: 'Evento futuro' }),
      event({ id: 'past', status: 'FINISHED', title: 'Evento passado' }),
    ]);
    await screen.findByText(/Evento futuro/);

    fireEvent.press(screen.getByText('Histórico'));

    expect(await screen.findByText(/Evento passado/)).toBeTruthy();
    expect(screen.queryByText(/Evento futuro/)).toBeNull();
  });

  it('navigates to the event detail screen when a row is pressed', async () => {
    renderScreen('MEMBER', [event({ id: 'event-42' })]);
    const row = await screen.findByText('🔥 Churrasco de Agosto');

    fireEvent.press(row);

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/events/[eventId]', params: { eventId: 'event-42' } });
  });

  it('shows an empty message when there are no upcoming events', async () => {
    renderScreen('MEMBER', []);

    expect(await screen.findByText('Nenhum evento agendado.')).toBeTruthy();
  });

  describe('permissions', () => {
    it('hides the "criar evento" button for a plain MEMBER (no event.manage)', async () => {
      renderScreen('MEMBER', [event()]);
      await screen.findByText(/Churrasco de Agosto/);

      expect(screen.queryByLabelText('Criar evento')).toBeNull();
    });

    it('shows the "criar evento" button for an ORGANIZER (has event.manage)', async () => {
      renderScreen('ORGANIZER', [event()]);
      await waitFor(() => expect(screen.queryByLabelText('Criar evento')).toBeTruthy());
    });

    it('pressing "criar evento" navigates to the create screen', async () => {
      renderScreen('ADMIN', [event()]);
      await waitFor(() => expect(screen.queryByLabelText('Criar evento')).toBeTruthy());

      fireEvent.press(screen.getByLabelText('Criar evento'));

      expect(mockPush).toHaveBeenCalledWith('/events/create');
    });
  });
});
