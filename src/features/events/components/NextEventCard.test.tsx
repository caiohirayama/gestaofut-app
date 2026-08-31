import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as eventEndpoints from '@/services/api/endpoints/events';
import { NextEventCard } from './NextEventCard';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

const GROUP_ID = 'group-1';

function event(overrides: Partial<eventEndpoints.Event> = {}): eventEndpoints.Event {
  return {
    id: 'event-1',
    groupId: GROUP_ID,
    type: 'BARBECUE',
    title: 'Churrasco de Agosto',
    description: null,
    startsAt: '2026-08-12T18:00:00.000Z',
    endsAt: '2026-08-12T22:00:00.000Z',
    locationName: null,
    status: 'OPEN',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function participant(overrides: Partial<eventEndpoints.EventParticipant> = {}): eventEndpoints.EventParticipant {
  return {
    id: 'participant-1',
    eventId: 'event-1',
    groupMemberId: 'member-1',
    status: 'CONFIRMED',
    confirmedAt: '2026-08-01T00:00:00.000Z',
    cancelledAt: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextEventCard groupId={GROUP_ID} />
    </QueryClientProvider>,
  );
}

describe('NextEventCard', () => {
  it('renders nothing when there is no upcoming event', async () => {
    const listSpy = jest.spyOn(eventEndpoints, 'listEvents').mockResolvedValue({ events: [] });

    const { toJSON } = renderCard();

    await waitFor(() => expect(listSpy).toHaveBeenCalled());
    await waitFor(() => expect(toJSON()).toBeNull());
  });

  it('shows the emoji + title, the short date, and the confirmed count for the soonest upcoming event', async () => {
    jest.spyOn(eventEndpoints, 'listEvents').mockResolvedValue({
      events: [event(), event({ id: 'later', status: 'FINISHED', startsAt: '2020-01-01T00:00:00.000Z' })],
    });
    jest.spyOn(eventEndpoints, 'listEventParticipants').mockResolvedValue({
      participants: [
        participant({ id: 'p1', status: 'CONFIRMED' }),
        participant({ id: 'p2', status: 'ATTENDED' }),
        participant({ id: 'p3', status: 'DECLINED' }),
      ],
    });

    renderCard();

    expect(await screen.findByText('🔥 Churrasco de Agosto')).toBeTruthy();
    expect(screen.getByText('12/08')).toBeTruthy();
    expect(await screen.findByText('2 confirmados')).toBeTruthy();
  });

  it('navigates to the event detail screen on press', async () => {
    jest.spyOn(eventEndpoints, 'listEvents').mockResolvedValue({ events: [event()] });
    jest.spyOn(eventEndpoints, 'listEventParticipants').mockResolvedValue({ participants: [] });

    renderCard();

    fireEvent.press(await screen.findByRole('button'));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/events/[eventId]', params: { eventId: 'event-1' } });
  });
});
