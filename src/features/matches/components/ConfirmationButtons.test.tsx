import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as matchEndpoints from '@/services/api/endpoints/matches';
import { ConfirmationButtons } from './ConfirmationButtons';

const GROUP_ID = 'group-1';
const MATCH_ID = 'match-1';

function participant(
  overrides: Partial<matchEndpoints.MatchParticipant> = {},
): matchEndpoints.MatchParticipant {
  return {
    id: 'participant-1',
    matchId: MATCH_ID,
    groupMemberId: 'member-1',
    typeAtMatch: 'REGULAR',
    status: 'PENDING',
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

function renderButtons(p: matchEndpoints.MatchParticipant, participants: matchEndpoints.MatchParticipant[] = [p]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfirmationButtons groupId={GROUP_ID} matchId={MATCH_ID} participant={p} participants={participants} />
    </QueryClientProvider>,
  );
}

describe('ConfirmationButtons', () => {
  it('shows "Vou jogar" and "Não vou" for a PENDING participant, and confirms on press', async () => {
    const confirmSpy = jest
      .spyOn(matchEndpoints, 'confirmMatchParticipant')
      .mockResolvedValue(participant({ status: 'CONFIRMED' }));
    renderButtons(participant({ status: 'PENDING' }));

    fireEvent.press(screen.getByRole('button', { name: 'Vou jogar' }));

    await waitFor(() =>
      expect(confirmSpy).toHaveBeenCalledWith(GROUP_ID, MATCH_ID, 'participant-1'),
    );
  });

  it('calls decline (not cancel) when "Não vou" is pressed from PENDING', async () => {
    const declineSpy = jest
      .spyOn(matchEndpoints, 'declineMatchParticipant')
      .mockResolvedValue(participant({ status: 'DECLINED' }));
    renderButtons(participant({ status: 'PENDING' }));

    fireEvent.press(screen.getByRole('button', { name: 'Não vou' }));

    await waitFor(() =>
      expect(declineSpy).toHaveBeenCalledWith(GROUP_ID, MATCH_ID, 'participant-1'),
    );
  });

  it('prevents double submit: both buttons are disabled while a confirmation is in flight', async () => {
    let resolveConfirm!: (value: matchEndpoints.MatchParticipant) => void;
    jest
      .spyOn(matchEndpoints, 'confirmMatchParticipant')
      .mockImplementation(() => new Promise((resolve) => (resolveConfirm = resolve)));
    renderButtons(participant({ status: 'PENDING' }));

    // Captured before pressing: once loading, the "Vou jogar" button swaps
    // its label for a spinner, so it can no longer be found by accessible
    // name — the already-held reference is what we assert on afterward.
    const confirmButton = screen.getByRole('button', { name: 'Vou jogar' });
    const declineButton = screen.getByRole('button', { name: 'Não vou' });
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(confirmButton.props.accessibilityState.disabled).toBe(true);
      expect(declineButton.props.accessibilityState.disabled).toBe(true);
    });

    resolveConfirm(participant({ status: 'CONFIRMED' }));
  });

  it('a second press while pending does not fire a second request', async () => {
    let resolveConfirm!: (value: matchEndpoints.MatchParticipant) => void;
    const confirmSpy = jest
      .spyOn(matchEndpoints, 'confirmMatchParticipant')
      .mockImplementation(() => new Promise((resolve) => (resolveConfirm = resolve)));
    renderButtons(participant({ status: 'PENDING' }));

    const confirmButton = screen.getByRole('button', { name: 'Vou jogar' });
    fireEvent.press(confirmButton);
    await waitFor(() => expect(confirmButton.props.accessibilityState.disabled).toBe(true));
    fireEvent.press(confirmButton);
    fireEvent.press(confirmButton);

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    resolveConfirm(participant({ status: 'CONFIRMED' }));
  });

  it('shows an inline error message when confirming fails', async () => {
    const { ApiError } = jest.requireActual('@/services/api/errors');
    jest
      .spyOn(matchEndpoints, 'confirmMatchParticipant')
      .mockRejectedValue(new ApiError('conflict', 'CONFLICT', 409));
    renderButtons(participant({ status: 'PENDING' }));

    fireEvent.press(screen.getByRole('button', { name: 'Vou jogar' }));

    expect(await screen.findByText('Não há mais vagas disponíveis para esse jogo.')).toBeTruthy();
  });

  it('for a CONFIRMED participant, shows a success indicator and a "Não vou mais" button that cancels', async () => {
    const cancelSpy = jest
      .spyOn(matchEndpoints, 'cancelMatchParticipant')
      .mockResolvedValue(participant({ status: 'CANCELLED' }));
    renderButtons(participant({ status: 'CONFIRMED' }));

    expect(screen.getByText('Presença confirmada')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Vou jogar' })).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Não vou mais' }));

    await waitFor(() =>
      expect(cancelSpy).toHaveBeenCalledWith(GROUP_ID, MATCH_ID, 'participant-1'),
    );
  });

  it('shows an informational message with no actions for a DECLINED participant', () => {
    renderButtons(participant({ status: 'DECLINED' }));

    expect(screen.getByText('Você recusou este jogo.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows an informational message with no actions for a CANCELLED participant', () => {
    renderButtons(participant({ status: 'CANCELLED' }));

    expect(screen.getByText('Você cancelou sua presença neste jogo.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  describe('WAITLISTED ("NA FILA")', () => {
    it('shows the waiting message, an approximate position, and only a "Sair da fila" button — no "Vou jogar"', () => {
      const waiting = participant({ id: 'me', status: 'WAITLISTED', queuePosition: 2 });
      const ahead = participant({ id: 'ahead', status: 'WAITLISTED', queuePosition: 1 });
      renderButtons(waiting, [ahead, waiting]);

      expect(screen.getByText('Você está na lista de espera.')).toBeTruthy();
      expect(screen.getByText('Posição aproximada: 2')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Sair da fila' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Vou jogar' })).toBeNull();
    });

    it('leaving the queue calls decline, not confirm', async () => {
      const declineSpy = jest
        .spyOn(matchEndpoints, 'declineMatchParticipant')
        .mockResolvedValue(participant({ status: 'DECLINED' }));
      const waiting = participant({ status: 'WAITLISTED', queuePosition: 1 });
      renderButtons(waiting);

      fireEvent.press(screen.getByRole('button', { name: 'Sair da fila' }));

      await waitFor(() =>
        expect(declineSpy).toHaveBeenCalledWith(GROUP_ID, MATCH_ID, 'participant-1'),
      );
    });
  });

  describe('OFFERED ("OFERTA")', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('shows the high-priority offer banner with ACEITAR VAGA / RECUSAR and a countdown derived from offerExpiresAt', () => {
      const offered = participant({
        status: 'OFFERED',
        offeredAt: '2026-01-01T00:00:00.000Z',
        offerExpiresAt: '2026-01-01T00:27:42.000Z',
      });
      renderButtons(offered);

      expect(screen.getByText('⚽ Uma vaga abriu para você.')).toBeTruthy();
      expect(screen.getByText('Você tem 27:42 para confirmar.')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'ACEITAR VAGA' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'RECUSAR' })).toBeTruthy();
    });

    it('the countdown re-derives from offerExpiresAt on every tick instead of being stored as its own state', () => {
      const offered = participant({ status: 'OFFERED', offerExpiresAt: '2026-01-01T00:01:00.000Z' });
      renderButtons(offered);

      expect(screen.getByText('Você tem 1:00 para confirmar.')).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(screen.getByText('Você tem 0:30 para confirmar.')).toBeTruthy();
    });

    it('ACEITAR VAGA calls confirm', async () => {
      const confirmSpy = jest
        .spyOn(matchEndpoints, 'confirmMatchParticipant')
        .mockResolvedValue(participant({ status: 'CONFIRMED' }));
      const offered = participant({ status: 'OFFERED', offerExpiresAt: '2026-01-01T00:01:00.000Z' });
      renderButtons(offered);

      fireEvent.press(screen.getByRole('button', { name: 'ACEITAR VAGA' }));

      await waitFor(() =>
        expect(confirmSpy).toHaveBeenCalledWith(GROUP_ID, MATCH_ID, 'participant-1'),
      );
    });

    it('RECUSAR calls decline', async () => {
      const declineSpy = jest
        .spyOn(matchEndpoints, 'declineMatchParticipant')
        .mockResolvedValue(participant({ status: 'DECLINED' }));
      const offered = participant({ status: 'OFFERED', offerExpiresAt: '2026-01-01T00:01:00.000Z' });
      renderButtons(offered);

      fireEvent.press(screen.getByRole('button', { name: 'RECUSAR' }));

      await waitFor(() =>
        expect(declineSpy).toHaveBeenCalledWith(GROUP_ID, MATCH_ID, 'participant-1'),
      );
    });

    it('disables ACEITAR VAGA once the countdown reaches zero', () => {
      const offered = participant({ status: 'OFFERED', offerExpiresAt: '2026-01-01T00:00:05.000Z' });
      renderButtons(offered);

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(screen.getByRole('button', { name: 'ACEITAR VAGA' }).props.accessibilityState.disabled).toBe(true);
    });
  });
});
