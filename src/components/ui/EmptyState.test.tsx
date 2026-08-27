import { render, screen } from '@testing-library/react-native';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title and optional message', () => {
    render(<EmptyState title="Jogos" message="Em breve." />);

    expect(screen.getByText('Jogos')).toBeTruthy();
    expect(screen.getByText('Em breve.')).toBeTruthy();
  });

  it('renders without a message', () => {
    render(<EmptyState title="Jogadores" />);
    expect(screen.getByText('Jogadores')).toBeTruthy();
  });
});
