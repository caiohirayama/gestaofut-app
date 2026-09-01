import { formatMoney, normalizeAmountInput, sumMoney } from './money';

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

describe('normalizeAmountInput — "Nova despesa" form field (accepts vírgula ou ponto)', () => {
  it('accepts a comma decimal separator (Brazilian keyboards)', () => {
    expect(normalizeAmountInput('60,5')).toBe('60.50');
  });

  it('accepts a dot decimal separator', () => {
    expect(normalizeAmountInput('60.5')).toBe('60.50');
  });

  it('accepts an integer amount, padding to two decimals', () => {
    expect(normalizeAmountInput('60')).toBe('60.00');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeAmountInput('  60,00  ')).toBe('60.00');
  });

  it('rejects zero — amount must be positive, direction is `type`, not sign', () => {
    expect(normalizeAmountInput('0')).toBeNull();
    expect(normalizeAmountInput('0,00')).toBeNull();
  });

  it('rejects a negative amount', () => {
    expect(normalizeAmountInput('-60')).toBeNull();
  });

  it('rejects non-numeric input', () => {
    expect(normalizeAmountInput('abc')).toBeNull();
    expect(normalizeAmountInput('')).toBeNull();
  });

  it('rejects more than two decimal places', () => {
    expect(normalizeAmountInput('60,555')).toBeNull();
  });
});
