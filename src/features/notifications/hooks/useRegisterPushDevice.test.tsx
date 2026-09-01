import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as notificationsEndpoints from '@/services/api/endpoints/notifications';
import { getSecureItem, SECURE_KEYS } from '@/services/secure-storage';
import * as pushTokenModule from '../utils/push-token';
import { useRegisterPushDevice } from './useRegisterPushDevice';

// The global jest.setup.js mock for expo-secure-store doesn't actually
// persist between getItemAsync/setItemAsync calls (each call independently
// resolves a fixed value) — fine for tests that only assert *which* calls
// were made, but useRegisterPushDevice's revoke() genuinely needs to read
// back what register() just wrote, so this file gets its own small
// in-memory-backed override instead. `jest.mock` factories are hoisted
// above imports at compile time regardless of source position, so this is
// safe to place after them (matching this codebase's own convention, e.g.
// GamesScreen.test.tsx's `jest.mock('expo-router', ...)`).
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    __clear: () => store.clear(),
  };
});

describe('useRegisterPushDevice — DEVICE / TOKEN REGISTRATION', () => {
  afterEach(() => {
    (jest.requireMock('expo-secure-store') as { __clear: () => void }).__clear();
  });

  it('register(): obtains the token and registers it with the API, remembering the subscription id', async () => {
    jest.spyOn(pushTokenModule, 'getExpoPushToken').mockResolvedValue({ status: 'obtained', token: 'ExponentPushToken[abc]', platform: 'IOS' });
    const registerSpy = jest
      .spyOn(notificationsEndpoints, 'registerPushSubscription')
      .mockResolvedValue({ id: 'sub-1', userId: 'user-1', token: 'ExponentPushToken[abc]', platform: 'IOS', status: 'ACTIVE', createdAt: 'now', updatedAt: 'now' });

    const { result } = renderHook(() => useRegisterPushDevice());
    await act(async () => {
      await result.current.register();
    });

    expect(registerSpy).toHaveBeenCalledWith({ token: 'ExponentPushToken[abc]', platform: 'IOS' });
    expect(result.current.stage).toBe('registered');
    expect(result.current.errorMessage).toBeNull();
    await expect(getSecureItem(SECURE_KEYS.pushSubscriptionId)).resolves.toBe('sub-1');
  });

  it('register(): calling it again for the same device reactivates rather than erroring (server-side upsert — "atualizar quando necessário")', async () => {
    jest.spyOn(pushTokenModule, 'getExpoPushToken').mockResolvedValue({ status: 'obtained', token: 'ExponentPushToken[abc]', platform: 'IOS' });
    const registerSpy = jest
      .spyOn(notificationsEndpoints, 'registerPushSubscription')
      .mockResolvedValue({ id: 'sub-1', userId: 'user-1', token: 'ExponentPushToken[abc]', platform: 'IOS', status: 'ACTIVE', createdAt: 'now', updatedAt: 'now' });

    const { result } = renderHook(() => useRegisterPushDevice());
    await act(async () => {
      await result.current.register();
    });
    await act(async () => {
      await result.current.register();
    });

    expect(registerSpy).toHaveBeenCalledTimes(2);
    expect(result.current.stage).toBe('registered');
  });

  it.each([
    ['unsupported-device' as const, 'unsupported-device'],
    ['missing-project-id' as const, 'missing-project-id'],
  ])('register(): surfaces %s as its own stage, without calling the API', async (tokenStatus, expectedStage) => {
    jest.spyOn(pushTokenModule, 'getExpoPushToken').mockResolvedValue({ status: tokenStatus });
    const registerSpy = jest.spyOn(notificationsEndpoints, 'registerPushSubscription');

    const { result } = renderHook(() => useRegisterPushDevice());
    await act(async () => {
      await result.current.register();
    });

    expect(result.current.stage).toBe(expectedStage);
    expect(registerSpy).not.toHaveBeenCalled();
  });

  it('register(): surfaces a friendly error and never crashes when obtaining the token itself fails', async () => {
    jest.spyOn(pushTokenModule, 'getExpoPushToken').mockResolvedValue({ status: 'error', error: new Error('native module unavailable') });

    const { result } = renderHook(() => useRegisterPushDevice());
    await act(async () => {
      await result.current.register();
    });

    expect(result.current.stage).toBe('error');
    expect(result.current.errorMessage).toBeTruthy();
  });

  it('register(): surfaces an API error message when the registration request itself fails', async () => {
    jest.spyOn(pushTokenModule, 'getExpoPushToken').mockResolvedValue({ status: 'obtained', token: 'ExponentPushToken[abc]', platform: 'IOS' });
    jest.spyOn(notificationsEndpoints, 'registerPushSubscription').mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useRegisterPushDevice());
    await act(async () => {
      await result.current.register();
    });

    expect(result.current.stage).toBe('error');
    expect(result.current.errorMessage).toBeTruthy();
  });

  it('revoke(): revokes the remembered subscription and forgets it locally ("permitir revogação")', async () => {
    jest.spyOn(pushTokenModule, 'getExpoPushToken').mockResolvedValue({ status: 'obtained', token: 'ExponentPushToken[abc]', platform: 'IOS' });
    jest
      .spyOn(notificationsEndpoints, 'registerPushSubscription')
      .mockResolvedValue({ id: 'sub-1', userId: 'user-1', token: 'ExponentPushToken[abc]', platform: 'IOS', status: 'ACTIVE', createdAt: 'now', updatedAt: 'now' });
    const revokeSpy = jest.spyOn(notificationsEndpoints, 'revokePushSubscription').mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      token: 'ExponentPushToken[abc]',
      platform: 'IOS',
      status: 'REVOKED',
      createdAt: 'now',
      updatedAt: 'now',
    });

    const { result } = renderHook(() => useRegisterPushDevice());
    await act(async () => {
      await result.current.register();
    });
    await act(async () => {
      await result.current.revoke();
    });

    expect(revokeSpy).toHaveBeenCalledWith('sub-1');
    expect(result.current.stage).toBe('idle');
    await expect(getSecureItem(SECURE_KEYS.pushSubscriptionId)).resolves.toBeNull();
  });

  it('revoke(): is a safe no-op when nothing was ever registered on this device', async () => {
    const revokeSpy = jest.spyOn(notificationsEndpoints, 'revokePushSubscription');

    const { result } = renderHook(() => useRegisterPushDevice());
    await act(async () => {
      await result.current.revoke();
    });

    expect(revokeSpy).not.toHaveBeenCalled();
    expect(result.current.stage).toBe('idle');
  });

  it('revoke(): still forgets the subscription locally even if the API call fails (best-effort)', async () => {
    jest.spyOn(pushTokenModule, 'getExpoPushToken').mockResolvedValue({ status: 'obtained', token: 'ExponentPushToken[abc]', platform: 'IOS' });
    jest
      .spyOn(notificationsEndpoints, 'registerPushSubscription')
      .mockResolvedValue({ id: 'sub-1', userId: 'user-1', token: 'ExponentPushToken[abc]', platform: 'IOS', status: 'ACTIVE', createdAt: 'now', updatedAt: 'now' });
    jest.spyOn(notificationsEndpoints, 'revokePushSubscription').mockRejectedValue(new Error('already gone'));

    const { result } = renderHook(() => useRegisterPushDevice());
    await act(async () => {
      await result.current.register();
    });
    await act(async () => {
      await result.current.revoke();
    });

    await expect(getSecureItem(SECURE_KEYS.pushSubscriptionId)).resolves.toBeNull();
  });

  it('exposes isRevoking while the revoke request is in flight', async () => {
    jest.spyOn(pushTokenModule, 'getExpoPushToken').mockResolvedValue({ status: 'obtained', token: 'ExponentPushToken[abc]', platform: 'IOS' });
    jest
      .spyOn(notificationsEndpoints, 'registerPushSubscription')
      .mockResolvedValue({ id: 'sub-1', userId: 'user-1', token: 'ExponentPushToken[abc]', platform: 'IOS', status: 'ACTIVE', createdAt: 'now', updatedAt: 'now' });
    let resolveRevoke!: () => void;
    jest.spyOn(notificationsEndpoints, 'revokePushSubscription').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRevoke = () =>
            resolve({ id: 'sub-1', userId: 'user-1', token: 'ExponentPushToken[abc]', platform: 'IOS', status: 'REVOKED', createdAt: 'now', updatedAt: 'now' });
        }),
    );

    const { result } = renderHook(() => useRegisterPushDevice());
    await act(async () => {
      await result.current.register();
    });

    let revokePromise!: Promise<void>;
    act(() => {
      revokePromise = result.current.revoke();
    });
    await waitFor(() => expect(result.current.isRevoking).toBe(true));

    resolveRevoke();
    await act(async () => {
      await revokePromise;
    });
    expect(result.current.isRevoking).toBe(false);
  });
});
