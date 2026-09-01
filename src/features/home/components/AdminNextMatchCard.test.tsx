import { fireEvent, render, screen } from '@testing-library/react-native';
import type { DashboardNextMatch } from '@/services/api/endpoints/dashboard';
import { AdminNextMatchCard } from './AdminNextMatchCard';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

function nextMatch(overrides: Partial<DashboardNextMatch> = {}): DashboardNextMatch {
  const inTwoHours = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  return {
    id: 'match-1',
    startsAt: inTwoHours,
    endsAt: inTwoHours,
    status: 'OPEN',
    locationName: 'Quadra Central',
    regularCapacity: 20,
    goalkeeperCapacity: 2,
    confirmed: 18,
    pending: 2,
    absent: 0,
    goalkeepers: 1,
    guests: 1,
    waitlisted: 0,
    ...overrides,
  };
}

beforeEach(() => {
  mockPush.mockClear();
});

describe('AdminNextMatchCard', () => {
  it('shows an empty prompt when there is no next match', () => {
    render(<AdminNextMatchCard nextMatch={null} />);

    expect(screen.getByText('Nenhum jogo agendado')).toBeTruthy();
  });

  it('shows "Jogo de hoje" when the match is today, with time/location/confirmed-capacity', () => {
    const today = new Date();
    today.setHours(today.getHours() + 1);
    render(<AdminNextMatchCard nextMatch={nextMatch({ startsAt: today.toISOString() })} />);

    expect(screen.getByText('⚽ Jogo de hoje')).toBeTruthy();
    expect(screen.getByText('Quadra Central')).toBeTruthy();
    expect(screen.getByText('18 / 20')).toBeTruthy();
  });

  it('shows "Próximo jogo" when the match is not today', () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    render(<AdminNextMatchCard nextMatch={nextMatch({ startsAt: nextWeek.toISOString() })} />);

    expect(screen.getByText('⚽ Próximo jogo')).toBeTruthy();
  });

  it('shows a "vaga(s)" badge with the remaining slots when there is room', () => {
    render(<AdminNextMatchCard nextMatch={nextMatch({ confirmed: 18, regularCapacity: 20 })} />);

    expect(screen.getByText('2 vagas')).toBeTruthy();
  });

  it('shows "Lotado" when there is no room left', () => {
    render(<AdminNextMatchCard nextMatch={nextMatch({ confirmed: 20, regularCapacity: 20 })} />);

    expect(screen.getByText('Lotado')).toBeTruthy();
  });

  it('shows "Sem limite" and "∞" for unlimited capacity', () => {
    render(<AdminNextMatchCard nextMatch={nextMatch({ confirmed: 18, regularCapacity: null })} />);

    expect(screen.getByText('Sem limite')).toBeTruthy();
    expect(screen.getByText('18 / ∞')).toBeTruthy();
  });

  it('shows the waitlist depth only when greater than zero', () => {
    const { rerender } = render(<AdminNextMatchCard nextMatch={nextMatch({ waitlisted: 0 })} />);
    expect(screen.queryByText(/na fila de espera/)).toBeNull();

    rerender(<AdminNextMatchCard nextMatch={nextMatch({ waitlisted: 3 })} />);
    expect(screen.getByText('3 na fila de espera')).toBeTruthy();
  });

  it('"Ver escala" navigates to the match detail screen', () => {
    render(<AdminNextMatchCard nextMatch={nextMatch({ id: 'match-42' })} />);

    fireEvent.press(screen.getByRole('button', { name: 'Ver escala' }));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/matches/[matchId]', params: { matchId: 'match-42' } });
  });
});
