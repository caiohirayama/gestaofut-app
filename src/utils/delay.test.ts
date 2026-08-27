import { delay } from './delay';

describe('delay', () => {
  it('resolves after the given time', async () => {
    jest.useFakeTimers();
    const promise = delay(1000);
    jest.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
    jest.useRealTimers();
  });
});
