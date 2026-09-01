import { render, screen } from '@testing-library/react-native';
import { CashBalanceSummary } from './CashBalanceSummary';

describe('CashBalanceSummary — "Saldo atual; Entradas do mês; Saídas do mês"', () => {
  it('renders all three tiles, formatted with the given currency', () => {
    render(<CashBalanceSummary balance="90.00" monthSummary={{ income: '150.00', expense: '60.00' }} currency="BRL" />);

    expect(screen.getByText('Saldo atual')).toBeTruthy();
    expect(screen.getByText('Entradas do mês')).toBeTruthy();
    expect(screen.getByText('Saídas do mês')).toBeTruthy();
    expect(screen.getByText(/90,00/)).toBeTruthy();
    expect(screen.getByText(/150,00/)).toBeTruthy();
    expect(screen.getByText(/60,00/)).toBeTruthy();
  });

  it('respects a non-BRL currency (UX: "respeitar currency fornecida pela API")', () => {
    render(<CashBalanceSummary balance="0.00" monthSummary={{ income: '0.00', expense: '0.00' }} currency="USD" />);

    expect(screen.queryByText(/R\$/)).toBeNull();
  });
});
