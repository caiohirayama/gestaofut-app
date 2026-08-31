import { formatMoney, sumMoney } from './money';

describe('sumMoney', () => {
  it('sums decimal amount strings without floating-point drift', () => {
    expect(sumMoney(['150.00', '80.00'])).toBe('230.00');
  });

  it('handles values that would drift under naive float addition (0.1 + 0.2)', () => {
    expect(sumMoney(['0.10', '0.20'])).toBe('0.30');
  });

  it('returns "0.00" for an empty list', () => {
    expect(sumMoney([])).toBe('0.00');
  });
});

describe('formatMoney — UX: "valores em BRL inicialmente, mas respeitar currency fornecida pela API"', () => {
  it('formats as BRL by default', () => {
    expect(formatMoney('150.00')).toBe('R$ 150,00');
  });

  it('respects a different currency explicitly passed in (never hardcoded)', () => {
    expect(formatMoney('150.00', 'USD')).toContain('150,00');
    expect(formatMoney('150.00', 'USD')).not.toContain('R$');
  });
});
