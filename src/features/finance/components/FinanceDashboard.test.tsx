import { render, screen } from '@testing-library/react-native';
import { FinanceDashboard } from './FinanceDashboard';

describe('FinanceDashboard — "previsto; recebido; pendente; avulsos"', () => {
  it('renders all four totals, formatted with the given currency', () => {
    render(
      <FinanceDashboard
        totals={{ previsto: '600.00', recebido: '150.00', pendente: '300.00', avulsos: '30.00' }}
        currency="BRL"
      />,
    );

    expect(screen.getByText('Previsto')).toBeTruthy();
    expect(screen.getByText('Recebido')).toBeTruthy();
    expect(screen.getByText('Pendente')).toBeTruthy();
    expect(screen.getByText('Avulsos')).toBeTruthy();
    expect(screen.getByText(/600,00/)).toBeTruthy();
    expect(screen.getByText(/150,00/)).toBeTruthy();
    expect(screen.getByText(/300,00/)).toBeTruthy();
    expect(screen.getByText(/30,00/)).toBeTruthy();
  });

  it('respects a non-BRL currency (UX: "respeitar currency fornecida pela API")', () => {
    render(<FinanceDashboard totals={{ previsto: '0.00', recebido: '0.00', pendente: '0.00', avulsos: '0.00' }} currency="USD" />);

    expect(screen.queryByText(/R\$/)).toBeNull();
  });
});
