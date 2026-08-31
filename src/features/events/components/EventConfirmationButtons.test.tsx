import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as eventEndpoints from '@/services/api/endpoints/events';
import { EventConfirmationButtons } from './EventConfirmationButtons';

const GROUP_ID = 'group-1';
const EVENT_ID = 'event-1';

function participant(overrides: Partial<eventEndpoints.EventParticipant> = {}): eventEndpoints.EventParticipant {
  return {
    id: 'participant-1',
    eventId: EVENT_ID,
    groupMemberId: 'member-1',
    status: 'INVITED',
    confirmedAt: null,
    cancelledAt: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function renderButtons(p: eventEndpoints.EventParticipant) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EventConfirmationButtons groupId={GROUP_ID} eventId={EVENT_ID} participant={p} />
    </QueryClientProvider>,
  );
}

describe('EventConfirmationButtons', () => {
  it('shows "Vou" and "Não vou" for an INVITED participant, and confirms on press', async () => {
    const confirmSpy = jest.spyOn(eventEndpoints, 'confirmEventParticipant').mockResolvedValue(participant({ status: 'CONFIRMED' }));
    renderButtons(participant({ status: 'INVITED' }));

    fireEvent.press(screen.getByRole('button', { name: 'Vou' }));

    await waitFor(() => expect(confirmSpy).toHaveBeenCalledWith(GROUP_ID, EVENT_ID, 'participant-1'));
  });

  it('calls decline when "Não vou" is pressed from INVITED', async () => {
    const declineSpy = jest.spyOn(eventEndpoints, 'declineEventParticipant').mockResolvedValue(participant({ status: 'DECLINED' }));
    renderButtons(participant({ status: 'INVITED' }));

    fireEvent.press(screen.getByRole('button', { name: 'Não vou' }));

    await waitFor(() => expect(declineSpy).toHaveBeenCalledWith(GROUP_ID, EVENT_ID, 'participant-1'));
  });

  it('prevents double submit: both buttons disable while a confirmation is in flight', async () => {
    let resolveConfirm!: (value: eventEndpoints.EventParticipant) => void;
    jest.spyOn(eventEndpoints, 'confirmEventParticipant').mockImplementation(() => new Promise((resolve) => (resolveConfirm = resolve)));
    renderButtons(participant({ status: 'INVITED' }));

    const confirmButton = screen.getByRole('button', { name: 'Vou' });
    const declineButton = screen.getByRole('button', { name: 'Não vou' });
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(confirmButton.props.accessibilityState.disabled).toBe(true);
      expect(declineButton.props.accessibilityState.disabled).toBe(true);
    });

    resolveConfirm(participant({ status: 'CONFIRMED' }));
  });

  it('a second press while pending does not fire a second request', async () => {
    let resolveConfirm!: (value: eventEndpoints.EventParticipant) => void;
    const confirmSpy = jest
      .spyOn(eventEndpoints, 'confirmEventParticipant')
      .mockImplementation(() => new Promise((resolve) => (resolveConfirm = resolve)));
    renderButtons(participant({ status: 'INVITED' }));

    const confirmButton = screen.getByRole('button', { name: 'Vou' });
    fireEvent.press(confirmButton);
    await waitFor(() => expect(confirmButton.props.accessibilityState.disabled).toBe(true));
    fireEvent.press(confirmButton);
    fireEvent.press(confirmButton);

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    resolveConfirm(participant({ status: 'CONFIRMED' }));
  });

  it('shows an inline error message when confirming fails', async () => {
    const { ApiError } = jest.requireActual('@/services/api/errors');
    jest.spyOn(eventEndpoints, 'confirmEventParticipant').mockRejectedValue(new ApiError('conflict', 'CONFLICT', 409));
    renderButtons(participant({ status: 'INVITED' }));

    fireEvent.press(screen.getByRole('button', { name: 'Vou' }));

    expect(await screen.findByText('Essa ação não é mais possível para esse convite.')).toBeTruthy();
  });

  it('for a CONFIRMED participant, shows a success indicator and a "Não vou mais" button that cancels', async () => {
    const cancelSpy = jest.spyOn(eventEndpoints, 'cancelEventParticipant').mockResolvedValue(participant({ status: 'CANCELLED' }));
    renderButtons(participant({ status: 'CONFIRMED' }));

    expect(screen.getByText('Presença confirmada')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Vou' })).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Não vou mais' }));

    await waitFor(() => expect(cancelSpy).toHaveBeenCalledWith(GROUP_ID, EVENT_ID, 'participant-1'));
  });

  it('shows an informational message with no actions for a DECLINED participant', () => {
    renderButtons(participant({ status: 'DECLINED' }));

    expect(screen.getByText('Você não vai a este evento.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows an informational message with no actions for a CANCELLED participant', () => {
    renderButtons(participant({ status: 'CANCELLED' }));

    expect(screen.getByText('Você cancelou sua presença neste evento.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows an informational message with no actions for ATTENDED/NO_SHOW (admin-only transitions)', () => {
    renderButtons(participant({ status: 'ATTENDED' }));
    expect(screen.getByText('Sua presença já foi registrada.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
