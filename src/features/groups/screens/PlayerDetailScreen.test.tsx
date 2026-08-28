import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as authEndpoints from '@/services/api/endpoints/auth';
import * as groupEndpoints from '@/services/api/endpoints/groups';
import * as organizationEndpoints from '@/services/api/endpoints/organizations';
import { useAuthStore } from '@/store/auth-store';
import { useGroupStore } from '@/store/group-store';
import { PlayerDetailScreen } from './PlayerDetailScreen';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ memberId: 'member-1' }),
}));

const me = { id: 'me-id', name: 'Ada', email: 'ada@example.com', phone: null, status: 'ACTIVE' as const, createdAt: '', updatedAt: '' };

const baseMember: groupEndpoints.GroupMember = {
  id: 'member-1',
  groupId: 'group-1',
  userId: 'aaaaaaaa-1111-1111-1111-111111111111',
  membershipType: 'GUEST',
  status: 'ACTIVE',
  joinedAt: '2026-01-01T00:00:00.000Z',
  leftAt: null,
};

const historyEntry: groupEndpoints.GroupMemberHistoryEntry = {
  id: 'history-1',
  groupMemberId: 'member-1',
  fromMembershipType: null,
  toMembershipType: 'GUEST',
  fromStatus: null,
  toStatus: 'ACTIVE',
  actorUserId: 'me-id',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderScreen(role: 'MEMBER' | 'ADMIN', member: groupEndpoints.GroupMember = baseMember) {
  useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  useGroupStore.setState({ activeGroupId: 'group-1', activeOrganizationId: 'org-1' });
  jest.spyOn(authEndpoints, 'getMe').mockResolvedValue(me);
  jest
    .spyOn(organizationEndpoints, 'listOrganizations')
    .mockResolvedValue({ organizations: [{ id: 'org-1', name: 'Org', slug: 'org', status: 'ACTIVE', createdAt: '', updatedAt: '' }] });
  jest
    .spyOn(organizationEndpoints, 'listOrganizationMembers')
    .mockResolvedValue({ members: [{ organizationId: 'org-1', userId: me.id, role, status: 'ACTIVE', joinedAt: '' }] });
  jest.spyOn(groupEndpoints, 'listGroupMembers').mockResolvedValue({ members: [member] });
  jest.spyOn(groupEndpoints, 'getGroupMemberHistory').mockResolvedValue({ history: [historyEntry] });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PlayerDetailScreen />
    </QueryClientProvider>,
  );
}

describe('PlayerDetailScreen', () => {
  it('shows basic info, membership, and history', async () => {
    renderScreen('MEMBER');

    expect(await screen.findByText('Jogador aaaaaaaa')).toBeTruthy();
    expect(screen.getByText(baseMember.userId)).toBeTruthy();
    expect(screen.getByText('Avulso')).toBeTruthy();
    expect(screen.getByText('Entrou como Avulso')).toBeTruthy();
  });

  it('hides administration actions for a plain MEMBER (no member.manage)', async () => {
    renderScreen('MEMBER');
    await screen.findByText('Jogador aaaaaaaa');

    expect(screen.queryByText('Administração')).toBeNull();
    expect(screen.queryByText('Desativar')).toBeNull();
  });

  it('shows administration actions for an ADMIN (has member.manage), including "promote" only for a GUEST', async () => {
    renderScreen('ADMIN');

    expect(await screen.findByText('Administração')).toBeTruthy();
    expect(screen.getByText('Promover para mensalista')).toBeTruthy();
    expect(screen.getByText('Desativar')).toBeTruthy();
  });

  it('does not offer "promote" for a member that is already REGULAR', async () => {
    renderScreen('ADMIN', { ...baseMember, membershipType: 'REGULAR' });
    await screen.findByText('Administração');

    expect(screen.queryByText('Promover para mensalista')).toBeNull();
  });

  it('disables "Desativar" once the member is already INACTIVE', async () => {
    renderScreen('ADMIN', { ...baseMember, status: 'INACTIVE', leftAt: '2026-02-01T00:00:00.000Z' });
    await screen.findByText('Administração');

    const button = screen.getByRole('button', { name: 'Desativar' });
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  it('asks for confirmation before deactivating, and only deactivates on confirm', async () => {
    const deactivateSpy = jest.spyOn(groupEndpoints, 'deactivateGroupMember').mockResolvedValue({
      member: { ...baseMember, status: 'INACTIVE', leftAt: '2026-02-01T00:00:00.000Z' },
    });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirm = buttons?.find((b) => b.text === 'Desativar');
      confirm?.onPress?.();
    });
    renderScreen('ADMIN');
    await screen.findByText('Administração');

    fireEvent.press(screen.getByRole('button', { name: 'Desativar' }));

    expect(alertSpy).toHaveBeenCalledWith('Desativar jogador', expect.any(String), expect.any(Array));
    await waitFor(() => expect(deactivateSpy).toHaveBeenCalledWith('group-1', 'member-1'));
  });

  it('does not deactivate when the confirmation is cancelled', async () => {
    const deactivateSpy = jest.spyOn(groupEndpoints, 'deactivateGroupMember');
    jest.spyOn(Alert, 'alert').mockImplementation(() => {
      // simulates the user dismissing/cancelling — no button pressed
    });
    renderScreen('ADMIN');
    await screen.findByText('Administração');

    fireEvent.press(screen.getByRole('button', { name: 'Desativar' }));

    expect(deactivateSpy).not.toHaveBeenCalled();
  });

  it('asks for confirmation before promoting a guest', async () => {
    const promoteSpy = jest.spyOn(groupEndpoints, 'promoteGroupMember').mockResolvedValue({
      member: { ...baseMember, membershipType: 'REGULAR' },
    });
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirm = buttons?.find((b) => b.text === 'Promover');
      confirm?.onPress?.();
    });
    renderScreen('ADMIN');
    await screen.findByText('Promover para mensalista');

    fireEvent.press(screen.getByText('Promover para mensalista'));

    await waitFor(() => expect(promoteSpy).toHaveBeenCalledWith('group-1', 'member-1'));
  });
});
