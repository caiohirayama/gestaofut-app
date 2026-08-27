import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from './Button';

describe('Button', () => {
  it('renders its label', () => {
    render(<Button label="Entrar" onPress={() => {}} />);
    expect(screen.getByText('Entrar')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<Button label="Entrar" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Entrar" onPress={onPress} disabled />);

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a spinner instead of the label while loading', () => {
    render(<Button label="Entrar" onPress={() => {}} loading />);
    expect(screen.queryByText('Entrar')).toBeNull();
  });
});
