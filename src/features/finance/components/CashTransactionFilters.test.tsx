import { fireEvent, render, screen } from '@testing-library/react-native';
import { CashTransactionFilters } from './CashTransactionFilters';

describe('CashTransactionFilters — "Filtros: categoria"', () => {
  it('reports undefined (meaning "todas") when "Todas" is selected', () => {
    const onChange = jest.fn();
    render(<CashTransactionFilters value={{ category: 'BALLS' }} onChange={onChange} />);

    fireEvent.press(screen.getByText('Todas'));

    expect(onChange).toHaveBeenCalledWith({ category: undefined });
  });

  it('selecting a category reports it', () => {
    const onChange = jest.fn();
    render(<CashTransactionFilters value={{}} onChange={onChange} />);

    fireEvent.press(screen.getByText('Bolas'));

    expect(onChange).toHaveBeenCalledWith({ category: 'BALLS' });
  });
});
