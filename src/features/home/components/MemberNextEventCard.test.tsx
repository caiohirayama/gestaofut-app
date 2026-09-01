import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as authEndpoints from '@/services/api/endpoints/auth';
import type { DashboardNextEvent } from '@/services/api/endpoints/dashboard';
import * as eventEndpoints from '@/services/api/endpoints/events';
import * as groupEndpoints from '@/services/api/endpoints/groups';
import { useAuthStore } from '@/store/auth-store';
import { MemberNextEventCard } from './MemberNextEventCard';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

const GROUP_ID = 'group-1';
const me = { id: 'me-id', name: 'Ada', email: 'ada@example.com', phone: null, status: 'ACTIVE' as const, createdAt: '', updatedAt: '' };
const myMember: groupEndpoints.GroupMember = {
  id: 'member-me',
  groupId: GROUP_ID,
  userId: 'me-id',
  membershipType: 'REGULAR',
  status: 'ACTIVE',
  joinedAt: '',
  leftAt: null,
};

function nextEvent(overrides: Partial<DashboardNextEvent> = {}): DashboardNextEvent {
  return {
    id: 'event-1',
    type: 'BARBECUE',
    title: 'Churrasco de Agosto',
    startsAt: '2026-08-12T18:00:00.000Z',
    endsAt: '2026-08-12T22:00:00.000Z',
    status: 'OPEN',
    confirmed: 18,
    ...overrides,
  };
}

function participant(overrides: Partial<eventEndpoints.EventParticipant> = {}): eventEndpoints.EventParticipant {
  return {
    id: 'participant-1',
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

function renderCard(
  event: DashboardNextEvent | null,
  options: { participants?: eventEndpoints.EventParticipant[]; entitlement?: eventEndpoints.EventEntitlement | null } = {},
) {
  const { participants = [], entitlement = null } = options;
  useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  jest.spyOn(authEndpoints, 'getMe').mockResolvedValue(me);
  jest.spyOn(groupEndpoints, 'listGroupMembers').mockResolvedValue({ members: [myMember] });
  jest.spyOn(eventEndpoints, 'listEventParticipants').mockResolvedValue({ participants });
  jest.spyOn(eventEndpoints, 'getMyEventEntitlement').mockResolvedValue({ entitlement });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemberNextEventCard groupId={GROUP_ID} nextEvent={event} />
    </QueryClientProvider>,
  );
}

describe('MemberNextEventCard', () => {
  it('renders nothing when there is no next event', () => {
    const { toJSON } = renderCard(null);

    expect(toJSON()).toBeNull();
  });

  it('shows the emoji/title/date', async () => {
    renderCard(nextEvent());

    expect(await screen.findByText('🔥 Churrasco de Agosto')).toBeTruthy();
  });

  it('shows "Incluso na mensalidade" only when the caller has a non-revoked entitlement', async () => {
    renderCard(nextEvent(), {
      entitlement: { id: 'ent-1', eventId: 'event-1', groupMemberId: 'member-me', source: 'MONTHLY_FEE_PAID', grantedAt: '', revokedAt: null },
    });

    expect(await screen.findByText('Incluso na mensalidade')).toBeTruthy();
  });

  it('shows confirmation buttons when the caller has a participant record', async () => {
    renderCard(nextEvent(), { participants: [participant({ status: 'INVITED' })] });

    expect(await screen.findByRole('button', { name: 'Vou' })).toBeTruthy();
  });

  it('shows no confirmation buttons when the caller has no participant record', async () => {
    renderCard(nextEvent(), { participants: [] });

    await screen.findByText('🔥 Churrasco de Agosto');
    expect(screen.queryByRole('button', { name: 'Vou' })).toBeNull();
  });

  it('"Ver detalhes" navigates to the event detail screen', async () => {
    renderCard(nextEvent({ id: 'event-42' }));
    await screen.findByText('🔥 Churrasco de Agosto');

    fireEvent.press(screen.getByText('Ver detalhes'));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/events/[eventId]', params: { eventId: 'event-42' } });
  });
});
