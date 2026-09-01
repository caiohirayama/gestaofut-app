import { fireEvent, render, screen } from '@testing-library/react-native';
import type { AppNotification } from '@/services/api/endpoints/notifications';
import { NotificationListRow } from './NotificationListRow';

function baseNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'notification-1',
    userId: 'user-1',
    groupId: 'group-1',
    type: 'WAITLIST_OFFER',
    title: 'Uma vaga abriu para você',
    body: 'Você tem até 20:00 para confirmar sua vaga.',
    data: { matchId: 'match-1' },
    readAt: null,
    createdAt: '2026-03-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('NotificationListRow — ESTADOS: não lida / lida', () => {
  it('renders the type label and body', () => {
    render(<NotificationListRow notification={baseNotification()} onPress={jest.fn()} />);

    expect(screen.getByText('Vaga disponível')).toBeTruthy();
    expect(screen.getByText('Você tem até 20:00 para confirmar sua vaga.')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<NotificationListRow notification={baseNotification()} onPress={onPress} />);

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('marks an unread notification as selected (visually distinct)', () => {
    render(<NotificationListRow notification={baseNotification({ readAt: null })} onPress={jest.fn()} />);

    expect(screen.getByRole('button').props.accessibilityState.selected).toBe(true);
  });

  it('marks a read notification as not selected', () => {
    render(<NotificationListRow notification={baseNotification({ readAt: '2026-03-01T13:00:00.000Z' })} onPress={jest.fn()} />);

    expect(screen.getByRole('button').props.accessibilityState.selected).toBe(false);
  });
});
