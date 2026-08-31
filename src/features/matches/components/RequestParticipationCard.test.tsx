import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as matchEndpoints from '@/services/api/endpoints/matches';
import { RequestParticipationCard } from './RequestParticipationCard';

const GROUP_ID = 'group-1';
const MATCH_ID = 'match-1';

function participant(overrides: Partial<matchEndpoints.MatchParticipant> = {}): matchEndpoints.MatchParticipant {
  return {
    id: 'guest-participant',
    matchId: MATCH_ID,
    groupMemberId: 'member-1',
    typeAtMatch: 'GUEST',
    status: 'CONFIRMED',
    confirmedAt: null,
    cancelledAt: null,
    offeredAt: null,
    offerExpiresAt: null,
    queuePosition: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function renderCard(isFull: boolean) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RequestParticipationCard groupId={GROUP_ID} matchId={MATCH_ID} isFull={isFull} />
    </QueryClientProvider>,
  );
}

describe('RequestParticipationCard', () => {
  it('shows "Jogo lotado" with an "Entrar na lista de espera" button when the pool is full ("JOGO LOTADO")', () => {
    renderCard(true);

    expect(screen.getByText('Jogo lotado')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Entrar na lista de espera' })).toBeTruthy();
  });

  it('offers a direct join button when there is room, without the "lotado" message', () => {
    renderCard(false);

    expect(screen.queryByText('Jogo lotado')).toBeNull();
    expect(screen.getByRole('button', { name: 'Vou jogar' })).toBeTruthy();
  });

  it('calls requestGuestParticipation on press', async () => {
    const requestSpy = jest
      .spyOn(matchEndpoints, 'requestGuestParticipation')
      .mockResolvedValue(participant({ status: 'WAITLISTED', queuePosition: 1 }));
    renderCard(true);

    fireEvent.press(screen.getByRole('button', { name: 'Entrar na lista de espera' }));

    await waitFor(() => expect(requestSpy).toHaveBeenCalledWith(GROUP_ID, MATCH_ID));
  });

  it('prevents a double submit while the request is in flight', async () => {
    let resolveRequest!: (value: matchEndpoints.MatchParticipant) => void;
    const requestSpy = jest
      .spyOn(matchEndpoints, 'requestGuestParticipation')
      .mockImplementation(() => new Promise((resolve) => (resolveRequest = resolve)));
    renderCard(false);

    const joinButton = screen.getByRole('button', { name: 'Vou jogar' });
    fireEvent.press(joinButton);
    await waitFor(() => expect(joinButton.props.accessibilityState.disabled).toBe(true));
    fireEvent.press(joinButton);
    fireEvent.press(joinButton);

    expect(requestSpy).toHaveBeenCalledTimes(1);
    resolveRequest(participant({ status: 'CONFIRMED' }));
  });

  it('shows an inline error message when the request fails', async () => {
    const { ApiError } = jest.requireActual('@/services/api/errors');
    jest
      .spyOn(matchEndpoints, 'requestGuestParticipation')
      .mockRejectedValue(new ApiError('conflict', 'CONFLICT', 409));
    renderCard(false);

    fireEvent.press(screen.getByRole('button', { name: 'Vou jogar' }));

    expect(await screen.findByText('Não há mais vagas disponíveis para esse jogo.')).toBeTruthy();
  });
});
