import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import * as authEndpoints from '@/services/api/endpoints/auth';
import * as eventEndpoints from '@/services/api/endpoints/events';
import * as groupEndpoints from '@/services/api/endpoints/groups';
import * as matchEndpoints from '@/services/api/endpoints/matches';
import * as systemEndpoints from '@/services/api/endpoints/system';
import { useAuthStore } from '@/store/auth-store';
import { useGroupStore } from '@/store/group-store';
import { HomeScreen } from './HomeScreen';

function renderScreen() {
  useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  useGroupStore.setState({ activeGroupId: 'group-1', activeOrganizationId: 'org-1' });
  jest
    .spyOn(systemEndpoints, 'getHealth')
    .mockResolvedValue({ status: 'ok', uptime: 123, timestamp: '2026-01-01T00:00:00.000Z' });
  jest.spyOn(authEndpoints, 'getMe').mockResolvedValue({
    id: 'me-id',
    name: 'Ada',
    email: 'ada@example.com',
    phone: null,
    status: 'ACTIVE',
    createdAt: '',
    updatedAt: '',
  });
  jest.spyOn(groupEndpoints, 'getGroup').mockResolvedValue({
    id: 'group-1',
    organizationId: 'org-1',
    name: 'Churras FC',
    description: null,
    sportType: 'FOOTBALL',
    timezone: 'America/Sao_Paulo',
    status: 'ACTIVE',
    createdAt: '',
    updatedAt: '',
  });
  jest.spyOn(groupEndpoints, 'listGroupMembers').mockResolvedValue({ members: [] });
  jest.spyOn(matchEndpoints, 'listMatches').mockResolvedValue({ matches: [] });
  jest.spyOn(eventEndpoints, 'listEvents').mockResolvedValue({ events: [] });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HomeScreen />
    </QueryClientProvider>,
  );
}

describe('HomeScreen', () => {
  it('renders the greeting and the next-match highlight together', async () => {
    renderScreen();

    expect(screen.getByText('Olá 👋')).toBeTruthy();
    expect(await screen.findByText('Nenhum jogo agendado')).toBeTruthy();
    expect(screen.getByText('Conexão com o servidor')).toBeTruthy();
  });
});
