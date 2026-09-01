import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as matchEndpoints from '@/services/api/endpoints/matches';
import { useGroupStore } from '@/store/group-store';
import { CreateMatchScreen } from './CreateMatchScreen';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

function baseMatch(overrides: Partial<matchEndpoints.Match> = {}): matchEndpoints.Match {
  return {
    id: 'match-1',
    groupId: 'group-1',
    startsAt: '2026-09-12T18:00:00.000Z',
    endsAt: '2026-09-12T20:00:00.000Z',
    status: 'SCHEDULED',
    locationName: null,
    locationAddress: null,
    regularCapacity: 20,
    goalkeeperCapacity: 2,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function renderScreen() {
  useGroupStore.setState({ activeGroupId: 'group-1', activeOrganizationId: 'org-1' });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateMatchScreen />
    </QueryClientProvider>,
  );
}

describe('CreateMatchScreen', () => {
  it('submits the combined startsAt/endsAt and navigates to the new match on success', async () => {
    const created = baseMatch({ id: 'new-match' });
    const createSpy = jest.spyOn(matchEndpoints, 'createMatch').mockResolvedValue(created);

    renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText('DD/MM/AAAA'), '12/09/2026');
    fireEvent(screen.getByPlaceholderText('DD/MM/AAAA'), 'blur');
    fireEvent.changeText(screen.getByPlaceholderText('HH:MM'), '18:00');
    fireEvent(screen.getByPlaceholderText('HH:MM'), 'blur');
    fireEvent.changeText(screen.getByPlaceholderText('120'), '120');
    fireEvent(screen.getByPlaceholderText('120'), 'blur');
    fireEvent.changeText(screen.getByPlaceholderText('Ex.: Quadra Central'), 'Quadra Central');
    fireEvent(screen.getByPlaceholderText('Ex.: Quadra Central'), 'blur');

    await waitFor(() => expect(screen.getByRole('button', { name: 'Criar jogo' }).props.accessibilityState.disabled).toBe(false));
    fireEvent.press(screen.getByRole('button', { name: 'Criar jogo' }));

    await waitFor(() =>
      expect(createSpy).toHaveBeenCalledWith('group-1', {
        locationName: 'Quadra Central',
        locationAddress: undefined,
        startsAt: expect.any(String),
        endsAt: expect.any(String),
      }),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({ pathname: '/matches/[matchId]', params: { matchId: 'new-match' } }));
  });

  it('disables the submit button while the mutation is pending (double-submit guard)', async () => {
    let resolveCreate!: (value: matchEndpoints.Match) => void;
    jest.spyOn(matchEndpoints, 'createMatch').mockImplementation(() => new Promise((resolve) => (resolveCreate = resolve)));

    renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText('DD/MM/AAAA'), '12/09/2026');
    fireEvent(screen.getByPlaceholderText('DD/MM/AAAA'), 'blur');
    fireEvent.changeText(screen.getByPlaceholderText('HH:MM'), '18:00');
    fireEvent(screen.getByPlaceholderText('HH:MM'), 'blur');
    fireEvent.changeText(screen.getByPlaceholderText('120'), '120');
    fireEvent(screen.getByPlaceholderText('120'), 'blur');

    const submitButton = screen.getByRole('button', { name: 'Criar jogo' });
    await waitFor(() => expect(submitButton.props.accessibilityState.disabled).toBe(false));
    fireEvent.press(submitButton);

    await waitFor(() => expect(submitButton.props.accessibilityState.disabled).toBe(true));

    resolveCreate(baseMatch());
  });

  it('shows the API error message when creation fails', async () => {
    jest.spyOn(matchEndpoints, 'createMatch').mockRejectedValue(new Error('Falha ao criar jogo'));

    renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText('DD/MM/AAAA'), '12/09/2026');
    fireEvent(screen.getByPlaceholderText('DD/MM/AAAA'), 'blur');
    fireEvent.changeText(screen.getByPlaceholderText('HH:MM'), '18:00');
    fireEvent(screen.getByPlaceholderText('HH:MM'), 'blur');
    fireEvent.changeText(screen.getByPlaceholderText('120'), '120');
    fireEvent(screen.getByPlaceholderText('120'), 'blur');

    const submitButton = screen.getByRole('button', { name: 'Criar jogo' });
    await waitFor(() => expect(submitButton.props.accessibilityState.disabled).toBe(false));
    fireEvent.press(submitButton);

    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});
