import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as authEndpoints from '@/services/api/endpoints/auth';
import * as eventEndpoints from '@/services/api/endpoints/events';
import * as groupEndpoints from '@/services/api/endpoints/groups';
import * as organizationEndpoints from '@/services/api/endpoints/organizations';
import { useAuthStore } from '@/store/auth-store';
import { useGroupStore } from '@/store/group-store';
import { EventDetailScreen } from './EventDetailScreen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ eventId: 'event-1' }),
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

const me = {
  id: 'me-id',
  name: 'Ada',
  email: 'ada@example.com',
  phone: null, avatarUrl: null,
  status: 'ACTIVE' as const,
  createdAt: '',
  updatedAt: '',
};

const myMember: groupEndpoints.GroupMember = {
  id: 'member-me',
  groupId: 'group-1',
  userId: 'me-id',
  membershipType: 'REGULAR',
  status: 'ACTIVE',
  joinedAt: '',
  leftAt: null,
};

function baseEvent(overrides: Partial<eventEndpoints.Event> = {}): eventEndpoints.Event {
  return {
    id: 'event-1',
    groupId: 'group-1',
    type: 'BARBECUE',
    title: 'Churrasco de Agosto',
    description: 'Churrasco de fim de mês',
    startsAt: '2026-08-12T18:00:00.000Z',
    endsAt: '2026-08-12T22:00:00.000Z',
    locationName: 'Quadra Central',
    status: 'OPEN',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function participant(overrides: Partial<eventEndpoints.EventParticipant> = {}): eventEndpoints.EventParticipant {
  return {
    id: 'participant-me',
    eventId: 'event-1',
    groupMemberId: 'member-me',
    status: 'INVITED',
    confirmedAt: null,
    cancelledAt: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function renderScreen(
  options: {
    role?: 'MEMBER' | 'ADMIN';
    event?: eventEndpoints.Event;
    participants?: eventEndpoints.EventParticipant[];
    entitlement?: eventEndpoints.EventEntitlement | null;
  } = {},
) {
  const { role = 'MEMBER', event = baseEvent(), participants = [participant()], entitlement = null } = options;

  useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  useGroupStore.setState({ activeGroupId: 'group-1', activeOrganizationId: 'org-1' });
  jest.spyOn(authEndpoints, 'getMe').mockResolvedValue(me);
  jest.spyOn(organizationEndpoints, 'listOrganizations').mockResolvedValue({
    organizations: [{ id: 'org-1', name: 'Org', slug: 'org', status: 'ACTIVE', createdAt: '', updatedAt: '' }],
  });
  jest.spyOn(organizationEndpoints, 'listOrganizationMembers').mockResolvedValue({
    members: [{ organizationId: 'org-1', userId: me.id, role, status: 'ACTIVE', joinedAt: '' }],
  });
  jest.spyOn(groupEndpoints, 'listGroupMembers').mockResolvedValue({ members: [myMember] });
  jest.spyOn(eventEndpoints, 'getEvent').mockResolvedValue(event);
  jest.spyOn(eventEndpoints, 'listEventParticipants').mockResolvedValue({ participants });
  jest.spyOn(eventEndpoints, 'getMyEventEntitlement').mockResolvedValue({ entitlement });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EventDetailScreen />
    </QueryClientProvider>,
  );
}

describe('EventDetailScreen', () => {
  it('shows title, date/time, location and description', async () => {
    renderScreen();

    expect(await screen.findByText('🔥 Churrasco de Agosto')).toBeTruthy();
    expect(screen.getByText('Quadra Central')).toBeTruthy();
    expect(screen.getByText('Churrasco de fim de mês')).toBeTruthy();
  });

  it('shows "Incluso na mensalidade" only when the caller has a non-revoked entitlement', async () => {
    renderScreen({ entitlement: { id: 'ent-1', eventId: 'event-1', groupMemberId: 'member-me', source: 'MONTHLY_FEE_PAID', grantedAt: '', revokedAt: null } });

    expect(await screen.findByText('Incluso na mensalidade')).toBeTruthy();
  });

  it('does not show the benefit badge when the caller has no entitlement', async () => {
    renderScreen({ entitlement: null });

    await screen.findByText('🔥 Churrasco de Agosto');
    expect(screen.queryByText('Incluso na mensalidade')).toBeNull();
  });

  it('shows confirmation buttons for a caller with an INVITED participant record', async () => {
    renderScreen({ participants: [participant({ status: 'INVITED' })] });

    expect(await screen.findByRole('button', { name: 'Vou' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Não vou' })).toBeTruthy();
  });

  it('shows a neutral message when the caller was never invited', async () => {
    renderScreen({ participants: [] });

    expect(await screen.findByText('Você não foi convidado para este evento.')).toBeTruthy();
  });

  it('hides the admin section for a plain MEMBER (no event.manage)', async () => {
    renderScreen({ role: 'MEMBER' });
    await screen.findByText('Sua participação');

    expect(screen.queryByText('Administração')).toBeNull();
  });

  it('shows the admin section — edit, next-status action, cancel, and the participants roster — for an ADMIN', async () => {
    renderScreen({ role: 'ADMIN', event: baseEvent({ status: 'CLOSED' }) });

    await waitFor(() => expect(screen.getByText('Administração')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Editar evento' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Finalizar evento' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar evento' })).toBeTruthy();
    expect(screen.getByText(/Participantes \(/)).toBeTruthy();
  });

  it('shows no next-status action for a terminal (FINISHED) event, and no cancel action either', async () => {
    renderScreen({ role: 'ADMIN', event: baseEvent({ status: 'FINISHED' }) });

    await waitFor(() => expect(screen.getByText('Administração')).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Finalizar evento' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancelar evento' })).toBeNull();
  });

  it('navigates to the edit screen when "Editar evento" is pressed', async () => {
    renderScreen({ role: 'ADMIN' });

    fireEvent.press(await screen.findByRole('button', { name: 'Editar evento' }));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/events/[eventId]/edit', params: { eventId: 'event-1' } });
  });

  it('advancing the status (e.g. "Encerrar confirmações") calls updateEvent with the next status', async () => {
    const updateSpy = jest.spyOn(eventEndpoints, 'updateEvent').mockResolvedValue(baseEvent({ status: 'CLOSED' }));
    renderScreen({ role: 'ADMIN', event: baseEvent({ status: 'OPEN' }) });

    fireEvent.press(await screen.findByRole('button', { name: 'Encerrar confirmações' }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith('group-1', 'event-1', { status: 'CLOSED' }));
  });
});
