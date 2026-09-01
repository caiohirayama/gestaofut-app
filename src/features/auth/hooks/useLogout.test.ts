import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as secureStorage from '@/services/secure-storage';
import * as notificationsEndpoints from '@/services/api/endpoints/notifications';
import { useAuthStore } from '@/store/auth-store';
import { queryClient } from '@/services/api/query-client';
import * as authEndpoints from '@/services/api/endpoints/auth';
import { useLogout } from './useLogout';

function mockSecureItem(overrides: Partial<Record<string, string | null>> = {}) {
  const values: Record<string, string | null> = {
    [secureStorage.SECURE_KEYS.refreshToken]: 'stored-refresh-token',
    [secureStorage.SECURE_KEYS.pushSubscriptionId]: 'sub-1',
    ...overrides,
  };
  jest.spyOn(secureStorage, 'getSecureItem').mockImplementation(async (key: string) => values[key] ?? null);
}

describe('useLogout', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'authenticated', accessToken: 'access-token' });
    mockSecureItem();
    jest.spyOn(secureStorage, 'deleteSecureItem').mockResolvedValue();
    jest.spyOn(queryClient, 'clear');
    jest.spyOn(notificationsEndpoints, 'revokePushSubscription').mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      token: 'ExponentPushToken[x]',
      platform: 'IOS',
      status: 'REVOKED',
      createdAt: 'now',
      updatedAt: 'now',
    });
  });

  it('revokes the refresh token on the server and clears local session state', async () => {
    const logoutSpy = jest.spyOn(authEndpoints, 'logout').mockResolvedValue();

    const { result } = renderHook(() => useLogout());
    await act(async () => {
      await result.current.signOut();
    });

    expect(logoutSpy).toHaveBeenCalledWith('stored-refresh-token');
    expect(secureStorage.deleteSecureItem).toHaveBeenCalledWith(secureStorage.SECURE_KEYS.refreshToken);
    expect(useAuthStore.getState()).toMatchObject({ status: 'unauthenticated', accessToken: null });
    expect(queryClient.clear).toHaveBeenCalled();
  });

  it('PUSH: revokes this device\'s push subscription too, so a logged-out user stops receiving notifications', async () => {
    jest.spyOn(authEndpoints, 'logout').mockResolvedValue();

    const { result } = renderHook(() => useLogout());
    await act(async () => {
      await result.current.signOut();
    });

    expect(notificationsEndpoints.revokePushSubscription).toHaveBeenCalledWith('sub-1');
    expect(secureStorage.deleteSecureItem).toHaveBeenCalledWith(secureStorage.SECURE_KEYS.pushSubscriptionId);
  });

  it('PUSH: does nothing when this device never registered a push subscription', async () => {
    mockSecureItem({ [secureStorage.SECURE_KEYS.pushSubscriptionId]: null });
    jest.spyOn(authEndpoints, 'logout').mockResolvedValue();

    const { result } = renderHook(() => useLogout());
    await act(async () => {
      await result.current.signOut();
    });

    expect(notificationsEndpoints.revokePushSubscription).not.toHaveBeenCalled();
  });

  it('still clears local session state when the server call fails (e.g. offline)', async () => {
    jest.spyOn(authEndpoints, 'logout').mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useLogout());
    await act(async () => {
      await result.current.signOut();
    });

    expect(secureStorage.deleteSecureItem).toHaveBeenCalledWith(secureStorage.SECURE_KEYS.refreshToken);
    expect(useAuthStore.getState()).toMatchObject({ status: 'unauthenticated', accessToken: null });
  });

  it('still clears local session state when revoking the push subscription fails', async () => {
    jest.spyOn(authEndpoints, 'logout').mockResolvedValue();
    jest.spyOn(notificationsEndpoints, 'revokePushSubscription').mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useLogout());
    await act(async () => {
      await result.current.signOut();
    });

    expect(useAuthStore.getState()).toMatchObject({ status: 'unauthenticated', accessToken: null });
  });

  it('exposes isPending while the sign-out is in flight', async () => {
    let resolveLogout!: () => void;
    jest.spyOn(authEndpoints, 'logout').mockReturnValue(
      new Promise((resolve) => {
        resolveLogout = () => resolve();
      }),
    );

    const { result } = renderHook(() => useLogout());
    let signOutPromise!: Promise<void>;
    act(() => {
      signOutPromise = result.current.signOut();
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    resolveLogout();
    await act(async () => {
      await signOutPromise;
    });

    expect(result.current.isPending).toBe(false);
  });
});
