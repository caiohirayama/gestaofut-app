import { fireEvent, render, screen } from '@testing-library/react-native';
import { QuickActionsRow } from './QuickActionsRow';

describe('QuickActionsRow', () => {
  it('renders nothing when there are no actions', () => {
    const { toJSON } = render(<QuickActionsRow actions={[]} />);

    expect(toJSON()).toBeNull();
  });

  it('renders a tile per action and calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<QuickActionsRow actions={[{ key: 'player', icon: 'person-add-outline', label: 'Jogador', onPress }]} />);

    fireEvent.press(screen.getByRole('button', { name: 'Jogador' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders every action passed, independently pressable', () => {
    const onPressA = jest.fn();
    const onPressB = jest.fn();
    render(
      <QuickActionsRow
        actions={[
          { key: 'a', icon: 'person-add-outline', label: 'A', onPress: onPressA },
          { key: 'b', icon: 'cash-outline', label: 'B', onPress: onPressB },
        ]}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'B' }));

    expect(onPressA).not.toHaveBeenCalled();
    expect(onPressB).toHaveBeenCalledTimes(1);
  });
});
