import { render, screen } from '@testing-library/react-native';
import { Input } from './Input';

describe('Input — ACCESSIBILITY: label announced to screen readers', () => {
  it('exposes the visible label as the field\'s accessibilityLabel', () => {
    render(<Input label="E-mail" value="" onChangeText={() => {}} />);

    expect(screen.getByLabelText('E-mail')).toBeTruthy();
  });

  it('includes the error message in the accessibilityLabel, so it is announced too', () => {
    render(<Input label="E-mail" error="E-mail inválido" value="" onChangeText={() => {}} />);

    expect(screen.getByLabelText('E-mail. E-mail inválido')).toBeTruthy();
  });

  it('lets a caller override the default accessibilityLabel', () => {
    render(<Input label="E-mail" accessibilityLabel="Campo de e-mail customizado" value="" onChangeText={() => {}} />);

    expect(screen.getByLabelText('Campo de e-mail customizado')).toBeTruthy();
    expect(screen.queryByLabelText('E-mail')).toBeNull();
  });

  it('still renders sensibly with no label at all', () => {
    render(<Input placeholder="Buscar" value="" onChangeText={() => {}} />);

    expect(screen.getByPlaceholderText('Buscar')).toBeTruthy();
  });
});
