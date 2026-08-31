import { fireEvent, render, screen } from '@testing-library/react-native';
import type { GroupMember } from '@/services/api/endpoints/groups';
import { FinanceFilters } from './FinanceFilters';

const members: GroupMember[] = [
  { id: 'member-1', groupId: 'group-1', userId: 'user-1', membershipType: 'REGULAR', status: 'ACTIVE', joinedAt: '', leftAt: null },
  { id: 'member-2', groupId: 'group-1', userId: 'user-2', membershipType: 'GUEST', status: 'ACTIVE', joinedAt: '', leftAt: null },
];

describe('FinanceFilters — "Filtros: status; tipo; jogador"', () => {
  it('reports undefined (meaning "all") when "Todos" is selected for each filter', () => {
    const onChange = jest.fn();
    render(<FinanceFilters value={{}} onChange={onChange} members={members} currentUserId="user-1" />);

    fireEvent.press(screen.getAllByText('Todos')[0]!);

    expect(onChange).toHaveBeenCalledWith({ status: undefined });
  });

  it('selecting a status reports it', () => {
    const onChange = jest.fn();
    render(<FinanceFilters value={{}} onChange={onChange} members={members} currentUserId="user-1" />);

    fireEvent.press(screen.getByText('Vencido'));

    expect(onChange).toHaveBeenCalledWith({ status: 'OVERDUE' });
  });

  it('selecting a tipo reports it', () => {
    const onChange = jest.fn();
    render(<FinanceFilters value={{}} onChange={onChange} members={members} currentUserId="user-1" />);

    fireEvent.press(screen.getByText('Avulso (jogo)'));

    expect(onChange).toHaveBeenCalledWith({ kind: 'GUEST_MATCH_FEE' });
  });

  it('lists every member by display name, and selecting one reports their id', () => {
    const onChange = jest.fn();
    render(<FinanceFilters value={{}} onChange={onChange} members={members} currentUserId="user-1" />);

    expect(screen.getByText('Você')).toBeTruthy();
    expect(screen.getByText('Jogador user-2')).toBeTruthy();

    fireEvent.press(screen.getByText('Jogador user-2'));

    expect(onChange).toHaveBeenCalledWith({ groupMemberId: 'member-2' });
  });

  it('preserves the other filter values when changing one', () => {
    const onChange = jest.fn();
    render(<FinanceFilters value={{ status: 'PENDING', kind: 'MANUAL' }} onChange={onChange} members={members} currentUserId="user-1" />);

    fireEvent.press(screen.getByText('Jogador user-2'));

    expect(onChange).toHaveBeenCalledWith({ status: 'PENDING', kind: 'MANUAL', groupMemberId: 'member-2' });
  });
});
