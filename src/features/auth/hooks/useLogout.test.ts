import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as secureStorage from '@/services/secure-storage';
import { useAuthStore } from '@/store/auth-store';
import { queryClient } from '@/services/api/query-client';
import * as authEndpoints from '@/services/api/endpoints/auth';
import { useLogout } from './useLogout';

describe('useLogout', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'authenticated', accessToken: 'access-token' });
    jest.spyOn(secureStorage, 'getSecureItem').mockResolvedValue('stored-refresh-token');
    jest.spyOn(secureStorage, 'deleteSecureItem').mockResolvedValue();
    jest.spyOn(queryClient, 'clear');
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

  it('still clears local session state when the server call fails (e.g. offline)', async () => {
    jest.spyOn(authEndpoints, 'logout').mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useLogout());
    await act(async () => {
      await result.current.signOut();
    });

    expect(secureStorage.deleteSecureItem).toHaveBeenCalledWith(secureStorage.SECURE_KEYS.refreshToken);
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
