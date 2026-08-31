import { render, screen } from '@testing-library/react-native';
import type { GroupMember } from '@/services/api/endpoints/groups';
import type { EventParticipant } from '@/services/api/endpoints/events';
import { EventParticipantsPanel } from './EventParticipantsPanel';

const members: GroupMember[] = [
  { id: 'member-me', groupId: 'group-1', userId: 'me-id', membershipType: 'REGULAR', status: 'ACTIVE', joinedAt: '', leftAt: null },
  { id: 'member-other', groupId: 'group-1', userId: 'other-id', membershipType: 'REGULAR', status: 'ACTIVE', joinedAt: '', leftAt: null },
];

function participant(overrides: Partial<EventParticipant> = {}): EventParticipant {
  return {
    id: 'participant-1',
    eventId: 'event-1',
    groupMemberId: 'member-me',
    status: 'CONFIRMED',
    confirmedAt: '',
    cancelledAt: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('EventParticipantsPanel', () => {
  it('shows an empty message when there are no participants', () => {
    render(<EventParticipantsPanel participants={[]} members={members} currentUserId="me-id" />);

    expect(screen.getByText('Ninguém foi convidado ainda.')).toBeTruthy();
  });

  it('lists each participant by resolved name and status badge, marking the caller as "Você"', () => {
    render(
      <EventParticipantsPanel
        participants={[
          participant({ id: 'p1', groupMemberId: 'member-me', status: 'CONFIRMED' }),
          participant({ id: 'p2', groupMemberId: 'member-other', status: 'INVITED' }),
        ]}
        members={members}
        currentUserId="me-id"
      />,
    );

    expect(screen.getByText('Você')).toBeTruthy();
    expect(screen.getByText(/Jogador /)).toBeTruthy();
    expect(screen.getByText('Confirmado')).toBeTruthy();
    expect(screen.getByText('Convidado')).toBeTruthy();
  });
});
