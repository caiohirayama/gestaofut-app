import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as authEndpoints from '@/services/api/endpoints/auth';
import * as groupEndpoints from '@/services/api/endpoints/groups';
import * as organizationEndpoints from '@/services/api/endpoints/organizations';
import * as secureStorage from '@/services/secure-storage';
import { useAuthStore } from '@/store/auth-store';
import { useGroupStore } from '@/store/group-store';
import { GroupGateScreen } from './GroupGateScreen';

const mockReplace = jest.fn();

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    router: { replace: (...args: unknown[]) => mockReplace(...args), push: jest.fn() },
    Redirect: ({ href }: { href: unknown }) => (
      <Text>{`redirect:${typeof href === 'string' ? href : JSON.stringify(href)}`}</Text>
    ),
  };
});

const me = { id: 'me-id', name: 'Ada', email: 'ada@example.com', phone: null, avatarUrl: null, status: 'ACTIVE' as const, createdAt: '', updatedAt: '' };

function org(id: string) {
  return { id, name: `Org ${id}`, slug: id, status: 'ACTIVE' as const, createdAt: '', updatedAt: '' };
}

function group(id: string, organizationId: string) {
  return {
    id,
    organizationId,
    name: `Group ${id}`,
    description: null,
    sportType: 'FOOTBALL' as const,
    timezone: 'America/Sao_Paulo',
    status: 'ACTIVE' as const,
    logoUrl: null,
    createdAt: '',
    updatedAt: '',
  };
}

function member(organizationId: string, role: 'OWNER' | 'MEMBER') {
  return { organizationId, userId: me.id, role, status: 'ACTIVE' as const, joinedAt: '' };
}

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <GroupGateScreen />
    </QueryClientProvider>,
  );
}

describe('GroupGateScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
    useGroupStore.setState({ activeGroupId: null, activeOrganizationId: null });
    jest.spyOn(authEndpoints, 'getMe').mockResolvedValue(me);
    jest.spyOn(secureStorage, 'getSecureItem').mockResolvedValue(null);
    jest.spyOn(secureStorage, 'setSecureItem').mockResolvedValue();
  });

  it('shows a loading state while organizations/groups are still being fetched', async () => {
    // A controllable pending promise, not a truly-infinite one — resolved at
    // the end so it doesn't leak past the test and hang Jest's teardown.
    let resolveOrganizations!: (value: { organizations: organizationEndpoints.Organization[] }) => void;
    jest.spyOn(organizationEndpoints, 'listOrganizations').mockReturnValue(
      new Promise((resolve) => {
        resolveOrganizations = resolve;
      }),
    );

    renderScreen();

    await waitFor(() => expect(screen.getByText('Carregando seus grupos...')).toBeTruthy());

    resolveOrganizations({ organizations: [] });
    await screen.findByText('redirect:/(group-setup)/create');
  });

  it('shows an error state with retry when loading fails', async () => {
    const listOrganizationsSpy = jest
      .spyOn(organizationEndpoints, 'listOrganizations')
      .mockRejectedValue(new Error('network down'));

    renderScreen();

    const retry = await screen.findByText('Tentar novamente');
    listOrganizationsSpy.mockResolvedValue({ organizations: [] });
    fireEvent.press(retry);

    await waitFor(() => expect(listOrganizationsSpy).toHaveBeenCalledTimes(2));
  });

  it('nenhum grupo, mas pode criar (zero organizações): redirects to the create-group screen', async () => {
    jest.spyOn(organizationEndpoints, 'listOrganizations').mockResolvedValue({ organizations: [] });

    renderScreen();

    expect(await screen.findByText('redirect:/(group-setup)/create')).toBeTruthy();
  });

  it('nenhum grupo e sem permissão em nenhuma organização: shows the empty state, not the create flow', async () => {
    jest.spyOn(organizationEndpoints, 'listOrganizations').mockResolvedValue({ organizations: [org('org-1')] });
    jest.spyOn(organizationEndpoints, 'listOrganizationMembers').mockResolvedValue({ members: [member('org-1', 'MEMBER')] });
    jest.spyOn(groupEndpoints, 'listOrganizationGroups').mockResolvedValue({ groups: [] });

    renderScreen();

    expect(await screen.findByText('Nenhum grupo ainda')).toBeTruthy();
    expect(screen.queryByText(/redirect:/)).toBeNull();
  });

  it('um grupo: selects it automatically, persists it, and redirects straight to (app)', async () => {
    jest.spyOn(organizationEndpoints, 'listOrganizations').mockResolvedValue({ organizations: [org('org-1')] });
    jest.spyOn(organizationEndpoints, 'listOrganizationMembers').mockResolvedValue({ members: [member('org-1', 'OWNER')] });
    jest.spyOn(groupEndpoints, 'listOrganizationGroups').mockResolvedValue({ groups: [group('group-1', 'org-1')] });

    renderScreen();

    expect(await screen.findByText('redirect:/(app)')).toBeTruthy();
    expect(useGroupStore.getState()).toMatchObject({ activeGroupId: 'group-1', activeOrganizationId: 'org-1' });
    expect(secureStorage.setSecureItem).toHaveBeenCalledWith(secureStorage.SECURE_KEYS.activeGroupId, 'group-1');
  });

  it('vários grupos, sem grupo persistido: lets the user pick, then redirects on selection', async () => {
    jest.spyOn(organizationEndpoints, 'listOrganizations').mockResolvedValue({ organizations: [org('org-1')] });
    jest.spyOn(organizationEndpoints, 'listOrganizationMembers').mockResolvedValue({ members: [member('org-1', 'OWNER')] });
    jest
      .spyOn(groupEndpoints, 'listOrganizationGroups')
      .mockResolvedValue({ groups: [group('group-1', 'org-1'), group('group-2', 'org-1')] });

    renderScreen();

    expect(await screen.findByText('Group group-1')).toBeTruthy();
    expect(screen.getByText('Group group-2')).toBeTruthy();
    expect(screen.queryByText(/redirect:/)).toBeNull();

    fireEvent.press(screen.getByText('Group group-2'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(app)'));
    expect(useGroupStore.getState()).toMatchObject({ activeGroupId: 'group-2', activeOrganizationId: 'org-1' });
  });

  it('mudança de grupo: a still-valid persisted group id is auto-selected without prompting', async () => {
    jest.spyOn(secureStorage, 'getSecureItem').mockResolvedValue('group-2');
    jest.spyOn(organizationEndpoints, 'listOrganizations').mockResolvedValue({ organizations: [org('org-1')] });
    jest.spyOn(organizationEndpoints, 'listOrganizationMembers').mockResolvedValue({ members: [member('org-1', 'OWNER')] });
    jest
      .spyOn(groupEndpoints, 'listOrganizationGroups')
      .mockResolvedValue({ groups: [group('group-1', 'org-1'), group('group-2', 'org-1')] });

    renderScreen();

    expect(await screen.findByText('redirect:/(app)')).toBeTruthy();
    expect(useGroupStore.getState().activeGroupId).toBe('group-2');
  });
});
