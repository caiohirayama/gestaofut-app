import { act, renderHook } from '@testing-library/react-native';
import { useCountdown } from './useCountdown';

describe('useCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('derives remaining time from the target instant, not from a stored value', () => {
    const { result } = renderHook(() => useCountdown('2026-01-01T00:00:30.000Z'));

    expect(result.current.remainingMs).toBe(30000);
    expect(result.current.formatted).toBe('0:30');
    expect(result.current.isExpired).toBe(false);
  });

  it('recomputes on every tick by re-reading the clock against the same target', () => {
    const { result } = renderHook(() => useCountdown('2026-01-01T00:00:30.000Z'));

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(result.current.remainingMs).toBe(20000);
    expect(result.current.formatted).toBe('0:20');
  });

  it('reports expired once the target instant has passed, without going negative in the display', () => {
    const { result } = renderHook(() => useCountdown('2026-01-01T00:00:05.000Z'));

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(result.current.isExpired).toBe(true);
    expect(result.current.formatted).toBe('0:00');
  });

  it('treats a null target as already expired', () => {
    const { result } = renderHook(() => useCountdown(null));

    expect(result.current.isExpired).toBe(true);
    expect(result.current.formatted).toBe('0:00');
  });

  it('re-derives against a new target when the prop changes, never keeping the old countdown as authoritative', () => {
    const { result, rerender } = renderHook(
      ({ target }: { target: string | null }) => useCountdown(target),
      { initialProps: { target: '2026-01-01T00:00:05.000Z' as string | null } },
    );

    expect(result.current.formatted).toBe('0:05');

    rerender({ target: '2026-01-01T00:01:00.000Z' });

    expect(result.current.formatted).toBe('1:00');
  });
});
