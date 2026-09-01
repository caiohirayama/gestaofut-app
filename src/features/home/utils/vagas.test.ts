import { remainingSlots } from './vagas';

describe('remainingSlots', () => {
  it('returns null for unlimited capacity', () => {
    expect(remainingSlots(null, 5)).toBeNull();
  });

  it('subtracts confirmed from capacity', () => {
    expect(remainingSlots(20, 18)).toBe(2);
  });

  it('never goes negative, even if confirmed somehow exceeds capacity', () => {
    expect(remainingSlots(20, 25)).toBe(0);
  });

  it('is 0 (lotado) when confirmed equals capacity exactly', () => {
    expect(remainingSlots(20, 20)).toBe(0);
  });
});
