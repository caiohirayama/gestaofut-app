import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as authEndpoints from '@/services/api/endpoints/auth';
import * as groupEndpoints from '@/services/api/endpoints/groups';
import * as organizationEndpoints from '@/services/api/endpoints/organizations';
import { useAuthStore } from '@/store/auth-store';
import { useGroupStore } from '@/store/group-store';
import { MembersScreen } from './MembersScreen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

const me = { id: 'me-id', name: 'Ada', email: 'ada@example.com', phone: null, status: 'ACTIVE' as const, createdAt: '', updatedAt: '' };

function org() {
  return { id: 'org-1', name: 'Org', slug: 'org', status: 'ACTIVE' as const, createdAt: '', updatedAt: '' };
}

function member(overrides: Partial<groupEndpoints.GroupMember>): groupEndpoints.GroupMember {
  return {
    id: 'member-1',
    groupId: 'group-1',
    userId: 'aaaaaaaa-1111-1111-1111-111111111111',
    membershipType: 'REGULAR',
    status: 'ACTIVE',
    joinedAt: '2026-01-01T00:00:00.000Z',
    leftAt: null,
    ...overrides,
  };
}

function renderScreen(role: 'MEMBER' | 'ORGANIZER' | 'ADMIN', members: groupEndpoints.GroupMember[]) {
  useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  useGroupStore.setState({ activeGroupId: 'group-1', activeOrganizationId: 'org-1' });
  jest.spyOn(authEndpoints, 'getMe').mockResolvedValue(me);
  jest.spyOn(organizationEndpoints, 'listOrganizations').mockResolvedValue({ organizations: [org()] });
  jest
    .spyOn(organizationEndpoints, 'listOrganizationMembers')
    .mockResolvedValue({ members: [{ organizationId: 'org-1', userId: me.id, role, status: 'ACTIVE', joinedAt: '' }] });
  jest.spyOn(groupEndpoints, 'listGroupMembers').mockResolvedValue({ members });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MembersScreen />
    </QueryClientProvider>,
  );
}

describe('MembersScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('lists ACTIVE members by default (the "Todos" filter)', async () => {
    renderScreen('MEMBER', [
      member({ id: '1', userId: 'aaaaaaaa-active', status: 'ACTIVE' }),
      member({ id: '2', userId: 'bbbbbbbb-inactive', status: 'INACTIVE' }),
    ]);

    expect(await screen.findByText('Jogador aaaaaaaa')).toBeTruthy();
    expect(screen.queryByText('Jogador bbbbbbbb')).toBeNull();
  });

  it('switching to the "Inativos" filter shows inactive/suspended members instead', async () => {
    renderScreen('MEMBER', [
      member({ id: '1', userId: 'aaaaaaaa-active', status: 'ACTIVE' }),
      member({ id: '2', userId: 'bbbbbbbb-inactive', status: 'INACTIVE' }),
    ]);
    await screen.findByText('Jogador aaaaaaaa');

    fireEvent.press(screen.getByText('Inativos'));

    expect(await screen.findByText('Jogador bbbbbbbb')).toBeTruthy();
    expect(screen.queryByText('Jogador aaaaaaaa')).toBeNull();
  });

  it('search narrows the list by userId', async () => {
    renderScreen('MEMBER', [
      member({ id: '1', userId: 'aaaaaaaa-1111' }),
      member({ id: '2', userId: 'bbbbbbbb-2222' }),
    ]);
    await screen.findByText('Jogador aaaaaaaa');

    fireEvent.changeText(screen.getByPlaceholderText('Buscar por ID do usuário'), 'bbbbbbbb');

    expect(await screen.findByText('Jogador bbbbbbbb')).toBeTruthy();
    expect(screen.queryByText('Jogador aaaaaaaa')).toBeNull();
  });

  it('shows the current user\'s own row as "Você"', async () => {
    renderScreen('MEMBER', [member({ id: '1', userId: me.id })]);

    expect(await screen.findByText('Você')).toBeTruthy();
  });

  it('navigates to the player detail screen when a row is pressed', async () => {
    renderScreen('MEMBER', [member({ id: 'member-42', userId: 'aaaaaaaa-1111' })]);
    const row = await screen.findByText('Jogador aaaaaaaa');

    fireEvent.press(row);

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/player/[memberId]', params: { memberId: 'member-42' } });
  });

  describe('permissions', () => {
    it('hides the "add player" button for a plain MEMBER (no member.manage)', async () => {
      renderScreen('MEMBER', [member({ id: '1' })]);
      await screen.findByText('Jogador aaaaaaaa');

      expect(screen.queryByLabelText('Adicionar jogador')).toBeNull();
    });

    it('shows the "add player" button for an ORGANIZER (has member.manage)', async () => {
      renderScreen('ORGANIZER', [member({ id: '1' })]);
      await waitFor(() => expect(screen.queryByLabelText('Adicionar jogador')).toBeTruthy());
    });

    it('pressing "add player" navigates to the add-player screen', async () => {
      renderScreen('ADMIN', [member({ id: '1' })]);
      await waitFor(() => expect(screen.queryByLabelText('Adicionar jogador')).toBeTruthy());

      fireEvent.press(screen.getByLabelText('Adicionar jogador'));

      expect(mockPush).toHaveBeenCalledWith('/add-player');
    });
  });
});
