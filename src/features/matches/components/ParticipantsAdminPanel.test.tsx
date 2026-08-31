import { render, screen } from '@testing-library/react-native';
import type { GroupMember } from '@/services/api/endpoints/groups';
import type { MatchParticipant } from '@/services/api/endpoints/matches';
import { ParticipantsAdminPanel } from './ParticipantsAdminPanel';

function member(overrides: Partial<GroupMember> = {}): GroupMember {
  return {
    id: 'member-1',
    groupId: 'group-1',
    userId: 'aaaaaaaa-1111-1111-1111-111111111111',
    membershipType: 'REGULAR',
    status: 'ACTIVE',
    joinedAt: '',
    leftAt: null,
    ...overrides,
  };
}

function participant(overrides: Partial<MatchParticipant> = {}): MatchParticipant {
  return {
    id: 'participant-1',
    matchId: 'match-1',
    groupMemberId: 'member-1',
    typeAtMatch: 'REGULAR',
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

describe('ParticipantsAdminPanel', () => {
  it('buckets participants into the five named sections with counts', () => {
    const members = [
      member({ id: 'm1', userId: 'user-1' }),
      member({ id: 'm2', userId: 'user-2' }),
      member({ id: 'm3', userId: 'user-3', membershipType: 'GOALKEEPER' }),
    ];
    const participants = [
      participant({ id: 'p1', groupMemberId: 'm1', status: 'CONFIRMED' }),
      participant({ id: 'p2', groupMemberId: 'm2', status: 'PENDING' }),
      participant({
        id: 'p3',
        groupMemberId: 'm3',
        typeAtMatch: 'GOALKEEPER',
        status: 'CONFIRMED',
      }),
    ];

    render(
      <ParticipantsAdminPanel
        participants={participants}
        members={members}
        currentUserId="user-2"
      />,
    );

    expect(screen.getByText('Confirmados (1)')).toBeTruthy();
    expect(screen.getByText('Pendentes (1)')).toBeTruthy();
    expect(screen.getByText('Ausentes (0)')).toBeTruthy();
    expect(screen.getByText('Goleiros (1)')).toBeTruthy();
    expect(screen.getByText('Avulsos (0)')).toBeTruthy();
    expect(screen.getByText('Você')).toBeTruthy();
    expect(screen.getByText('Jogador user-1')).toBeTruthy();
  });

  it('shows a placeholder message for an empty section', () => {
    render(<ParticipantsAdminPanel participants={[]} members={[]} currentUserId={undefined} />);

    expect(screen.getAllByText('Ninguém nesta lista.')).toHaveLength(7);
    expect(screen.getByText('Nenhuma oferta em aberto.')).toBeTruthy();
  });

  it('shows the waitlist queues in order, numbered, per pool ("fila; ordem")', () => {
    const members = [
      member({ id: 'm1', userId: 'user-1' }),
      member({ id: 'm2', userId: 'user-2' }),
      member({ id: 'm3', userId: 'user-3', membershipType: 'GOALKEEPER' }),
    ];
    const participants = [
      participant({ id: 'second', groupMemberId: 'm2', status: 'WAITLISTED', queuePosition: 2 }),
      participant({ id: 'first', groupMemberId: 'm1', status: 'WAITLISTED', queuePosition: 1 }),
      participant({
        id: 'gk-waiting',
        groupMemberId: 'm3',
        typeAtMatch: 'GOALKEEPER',
        status: 'WAITLISTED',
        queuePosition: 1,
      }),
    ];

    render(<ParticipantsAdminPanel participants={participants} members={members} currentUserId={undefined} />);

    expect(screen.getByText('Fila de espera - linha (2)')).toBeTruthy();
    expect(screen.getByText('Fila de espera - goleiros (1)')).toBeTruthy();
    expect(screen.getByText(/1\. Jogador user-1/)).toBeTruthy();
    expect(screen.getByText(/2\. Jogador user-2/)).toBeTruthy();
  });

  it('shows active offers with a countdown ("ofertas ativas")', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const members = [member({ id: 'm1', userId: 'user-1' })];
    const participants = [
      participant({
        id: 'offered',
        groupMemberId: 'm1',
        status: 'OFFERED',
        offeredAt: '2026-01-01T00:00:00.000Z',
        offerExpiresAt: '2026-01-01T00:05:00.000Z',
      }),
    ];

    render(<ParticipantsAdminPanel participants={participants} members={members} currentUserId={undefined} />);

    expect(screen.getByText('Ofertas ativas (1)')).toBeTruthy();
    expect(screen.getByText('Jogador user-1')).toBeTruthy();
    expect(screen.getByText('5:00')).toBeTruthy();

    jest.useRealTimers();
  });
});
