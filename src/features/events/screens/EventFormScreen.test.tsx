import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as eventEndpoints from '@/services/api/endpoints/events';
import { useGroupStore } from '@/store/group-store';
import { toTimeInput } from '../utils/event-form-datetime';
import { EventFormScreen } from './EventFormScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
    back: (...args: unknown[]) => mockBack(...args),
  },
}));

function baseEvent(overrides: Partial<eventEndpoints.Event> = {}): eventEndpoints.Event {
  return {
    id: 'event-1',
    groupId: 'group-1',
    type: 'BARBECUE',
    title: 'Churrasco de Agosto',
    description: 'Churrasco de fim de mês',
    startsAt: '2026-08-12T18:00:00.000Z',
    endsAt: '2026-08-12T22:00:00.000Z',
    locationName: 'Quadra Central',
    status: 'DRAFT',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function renderScreen(eventId?: string) {
  useGroupStore.setState({ activeGroupId: 'group-1', activeOrganizationId: 'org-1' });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EventFormScreen eventId={eventId} />
    </QueryClientProvider>,
  );
}

describe('EventFormScreen — create mode', () => {
  it('submits the combined startsAt/endsAt and navigates to the new event on success', async () => {
    const created = baseEvent({ id: 'new-event' });
    const createSpy = jest.spyOn(eventEndpoints, 'createEvent').mockResolvedValue(created);

    renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText('Churrasco de Agosto'), 'Churrasco de Setembro');
    fireEvent(screen.getByPlaceholderText('Churrasco de Agosto'), 'blur');
    fireEvent.changeText(screen.getByPlaceholderText('DD/MM/AAAA'), '12/09/2026');
    fireEvent(screen.getByPlaceholderText('DD/MM/AAAA'), 'blur');
    fireEvent.changeText(screen.getByPlaceholderText('HH:MM'), '18:00');
    fireEvent(screen.getByPlaceholderText('HH:MM'), 'blur');
    fireEvent.changeText(screen.getByPlaceholderText('120'), '180');
    fireEvent(screen.getByPlaceholderText('120'), 'blur');

    await waitFor(() => expect(screen.getByRole('button', { name: 'Criar evento' }).props.accessibilityState.disabled).toBe(false));
    fireEvent.press(screen.getByRole('button', { name: 'Criar evento' }));

    await waitFor(() =>
      expect(createSpy).toHaveBeenCalledWith('group-1', {
        type: 'BARBECUE',
        title: 'Churrasco de Setembro',
        description: undefined,
        locationName: undefined,
        startsAt: expect.any(String),
        endsAt: expect.any(String),
      }),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({ pathname: '/events/[eventId]', params: { eventId: 'new-event' } }));
  });

  it('disables the submit button while the mutation is pending (double-submit guard)', async () => {
    let resolveCreate!: (value: eventEndpoints.Event) => void;
    jest.spyOn(eventEndpoints, 'createEvent').mockImplementation(() => new Promise((resolve) => (resolveCreate = resolve)));

    renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText('Churrasco de Agosto'), 'Churrasco de Setembro');
    fireEvent(screen.getByPlaceholderText('Churrasco de Agosto'), 'blur');
    fireEvent.changeText(screen.getByPlaceholderText('DD/MM/AAAA'), '12/09/2026');
    fireEvent(screen.getByPlaceholderText('DD/MM/AAAA'), 'blur');
    fireEvent.changeText(screen.getByPlaceholderText('HH:MM'), '18:00');
    fireEvent(screen.getByPlaceholderText('HH:MM'), 'blur');
    fireEvent.changeText(screen.getByPlaceholderText('120'), '180');
    fireEvent(screen.getByPlaceholderText('120'), 'blur');

    const submitButton = screen.getByRole('button', { name: 'Criar evento' });
    await waitFor(() => expect(submitButton.props.accessibilityState.disabled).toBe(false));
    fireEvent.press(submitButton);

    await waitFor(() => expect(submitButton.props.accessibilityState.disabled).toBe(true));

    resolveCreate(baseEvent());
  });
});

describe('EventFormScreen — edit mode', () => {
  it('pre-fills the form from the existing event and submits the edited fields', async () => {
    jest.spyOn(eventEndpoints, 'getEvent').mockResolvedValue(baseEvent());
    const updateSpy = jest.spyOn(eventEndpoints, 'updateEvent').mockResolvedValue(baseEvent({ title: 'Churrasco (adiado)' }));

    renderScreen('event-1');

    expect(await screen.findByDisplayValue('Churrasco de Agosto')).toBeTruthy();
    expect(screen.getByDisplayValue('12/08/2026')).toBeTruthy();
    expect(screen.getByDisplayValue(toTimeInput('2026-08-12T18:00:00.000Z'))).toBeTruthy();
    expect(screen.getByDisplayValue('240')).toBeTruthy();

    fireEvent.changeText(screen.getByDisplayValue('Churrasco de Agosto'), 'Churrasco (adiado)');
    fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith('group-1', 'event-1', {
        type: 'BARBECUE',
        title: 'Churrasco (adiado)',
        description: 'Churrasco de fim de mês',
        locationName: 'Quadra Central',
        startsAt: expect.any(String),
        endsAt: expect.any(String),
      }),
    );
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });
});
