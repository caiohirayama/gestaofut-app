import { renderHook, waitFor } from '@testing-library/react-native';
import * as secureStorage from '@/services/secure-storage';
import { useAuthStore } from '@/store/auth-store';
import { refreshAccessToken } from '@/services/api/token-refresh';
import { useBootstrapAuth } from './useBootstrapAuth';

jest.mock('@/services/api/token-refresh', () => ({
  refreshAccessToken: jest.fn(),
}));

const mockedRefreshAccessToken = refreshAccessToken as jest.Mock;

describe('useBootstrapAuth', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'loading', accessToken: null });
    mockedRefreshAccessToken.mockReset();
  });

  it('marks the session unauthenticated when there is no stored refresh token', async () => {
    jest.spyOn(secureStorage, 'getSecureItem').mockResolvedValue(null);

    renderHook(() => useBootstrapAuth());

    await waitFor(() => expect(useAuthStore.getState().status).toBe('unauthenticated'));
    expect(mockedRefreshAccessToken).not.toHaveBeenCalled();
  });

  it('restores the session by rotating the stored refresh token', async () => {
    jest.spyOn(secureStorage, 'getSecureItem').mockResolvedValue('persisted-refresh-token');
    mockedRefreshAccessToken.mockImplementation(async () => {
      useAuthStore.getState().signIn('fresh-access-token');
      return 'fresh-access-token';
    });

    renderHook(() => useBootstrapAuth());

    await waitFor(() => expect(useAuthStore.getState().status).toBe('authenticated'));
    expect(useAuthStore.getState().accessToken).toBe('fresh-access-token');
  });

  it('marks the session unauthenticated when the stored refresh token is rejected', async () => {
    jest.spyOn(secureStorage, 'getSecureItem').mockResolvedValue('revoked-refresh-token');
    mockedRefreshAccessToken.mockImplementation(async () => {
      useAuthStore.getState().signOut();
      throw new Error('Session expired');
    });

    renderHook(() => useBootstrapAuth());

    await waitFor(() => expect(useAuthStore.getState().status).toBe('unauthenticated'));
  });
});
