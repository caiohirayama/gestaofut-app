import * as secureStorage from '@/services/secure-storage';
import { useAuthStore } from '@/store/auth-store';
import { ApiError } from './errors';
import { refreshAccessToken } from './token-refresh';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('refreshAccessToken', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'loading', accessToken: null });
    globalThis.fetch = jest.fn();
  });

  it('throws UNAUTHORIZED and signs out when there is no stored refresh token', async () => {
    jest.spyOn(secureStorage, 'getSecureItem').mockResolvedValue(null);

    await expect(refreshAccessToken()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('rotates the refresh token, persists it, and signs in with the new access token', async () => {
    jest.spyOn(secureStorage, 'getSecureItem').mockResolvedValue('old-refresh-token');
    const setSecureItem = jest.spyOn(secureStorage, 'setSecureItem').mockResolvedValue();
    (globalThis.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(200, {
        user: { id: '1', name: 'Ada', email: 'ada@example.com', phone: null, status: 'ACTIVE' },
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      }),
    );

    const token = await refreshAccessToken();

    expect(token).toBe('new-access-token');
    expect(setSecureItem).toHaveBeenCalledWith(secureStorage.SECURE_KEYS.refreshToken, 'new-refresh-token');
    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      accessToken: 'new-access-token',
    });
  });

  it('clears the stored refresh token and signs out when the API rejects it', async () => {
    jest.spyOn(secureStorage, 'getSecureItem').mockResolvedValue('revoked-refresh-token');
    const deleteSecureItem = jest.spyOn(secureStorage, 'deleteSecureItem').mockResolvedValue();
    (globalThis.fetch as jest.Mock).mockResolvedValue(jsonResponse(401, { error: { code: 'UNAUTHORIZED' } }));

    await expect(refreshAccessToken()).rejects.toBeInstanceOf(ApiError);
    expect(deleteSecureItem).toHaveBeenCalledWith(secureStorage.SECURE_KEYS.refreshToken);
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('leaves the stored refresh token untouched on a network failure', async () => {
    jest.spyOn(secureStorage, 'getSecureItem').mockResolvedValue('some-refresh-token');
    const deleteSecureItem = jest.spyOn(secureStorage, 'deleteSecureItem').mockResolvedValue();
    (globalThis.fetch as jest.Mock).mockRejectedValue(new Error('offline'));

    await expect(refreshAccessToken()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(deleteSecureItem).not.toHaveBeenCalled();
  });

  it('deduplicates concurrent callers into a single network request', async () => {
    jest.spyOn(secureStorage, 'getSecureItem').mockResolvedValue('old-refresh-token');
    jest.spyOn(secureStorage, 'setSecureItem').mockResolvedValue();
    let resolveFetch!: (value: Response) => void;
    (globalThis.fetch as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const first = refreshAccessToken();
    const second = refreshAccessToken();

    resolveFetch(
      jsonResponse(200, {
        user: { id: '1', name: 'Ada', email: 'ada@example.com', phone: null, status: 'ACTIVE' },
        accessToken: 'token-a',
        refreshToken: 'token-b',
      }),
    );

    const [firstToken, secondToken] = await Promise.all([first, second]);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(firstToken).toBe('token-a');
    expect(secondToken).toBe('token-a');
  });
});
