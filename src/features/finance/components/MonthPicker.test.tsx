import { fireEvent, render, screen } from '@testing-library/react-native';
import { MonthPicker } from './MonthPicker';

describe('MonthPicker — "Filtros: mês"', () => {
  it('shows the current month label', () => {
    render(<MonthPicker value={{ year: 2026, month: 3 }} onChange={jest.fn()} />);

    expect(screen.getByText('Março 2026')).toBeTruthy();
  });

  it('moves to the next month', () => {
    const onChange = jest.fn();
    render(<MonthPicker value={{ year: 2026, month: 3 }} onChange={onChange} />);

    fireEvent.press(screen.getByLabelText('Próximo mês'));

    expect(onChange).toHaveBeenCalledWith({ year: 2026, month: 4 });
  });

  it('moves to the previous month, rolling into the prior year at January', () => {
    const onChange = jest.fn();
    render(<MonthPicker value={{ year: 2026, month: 1 }} onChange={onChange} />);

    fireEvent.press(screen.getByLabelText('Mês anterior'));

    expect(onChange).toHaveBeenCalledWith({ year: 2025, month: 12 });
  });
});
