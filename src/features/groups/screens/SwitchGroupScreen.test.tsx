import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as groupEndpoints from '@/services/api/endpoints/groups';
import * as organizationEndpoints from '@/services/api/endpoints/organizations';
import * as secureStorage from '@/services/secure-storage';
import { useAuthStore } from '@/store/auth-store';
import { useGroupStore } from '@/store/group-store';
import { SwitchGroupScreen } from './SwitchGroupScreen';

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args), push: (...args: unknown[]) => mockPush(...args) },
}));

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
    createdAt: '',
    updatedAt: '',
  };
}

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SwitchGroupScreen />
    </QueryClientProvider>,
  );
}

describe('SwitchGroupScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
    useGroupStore.setState({ activeGroupId: 'group-1', activeOrganizationId: 'org-1' });
    mockReplace.mockClear();
    jest.spyOn(secureStorage, 'setSecureItem').mockResolvedValue();
    jest.spyOn(organizationEndpoints, 'listOrganizations').mockResolvedValue({ organizations: [org('org-1')] });
    jest
      .spyOn(groupEndpoints, 'listOrganizationGroups')
      .mockResolvedValue({ groups: [group('group-1', 'org-1'), group('group-2', 'org-1')] });
  });

  it('lists every group regardless of count, since this is an explicit user action', async () => {
    renderScreen();

    expect(await screen.findByText('Group group-1')).toBeTruthy();
    expect(screen.getByText('Group group-2')).toBeTruthy();
  });

  it('switching updates the active group, persists it, and returns to (app)', async () => {
    renderScreen();

    fireEvent.press(await screen.findByText('Group group-2'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(app)'));
    expect(useGroupStore.getState()).toMatchObject({ activeGroupId: 'group-2', activeOrganizationId: 'org-1' });
    expect(secureStorage.setSecureItem).toHaveBeenCalledWith(secureStorage.SECURE_KEYS.activeGroupId, 'group-2');
  });
});
