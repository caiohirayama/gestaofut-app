import { useAuthStore } from '@/store/auth-store';
import { apiFetch } from './client';
import { ApiError } from './errors';
import { refreshAccessToken } from './token-refresh';

jest.mock('./token-refresh', () => ({
  refreshAccessToken: jest.fn(),
}));

const mockedRefreshAccessToken = refreshAccessToken as jest.Mock;

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('apiFetch', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'authenticated', accessToken: 'initial-access-token' });
    globalThis.fetch = jest.fn();
    mockedRefreshAccessToken.mockReset();
  });

  it('sends the current access token as a bearer header by default', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, { ok: true }));

    await apiFetch('/me');

    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer initial-access-token');
  });

  it('skips the Authorization header when auth: false', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, { ok: true }));

    await apiFetch('/auth/login', { method: 'POST', body: {}, auth: false });

    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('on a 401 from an authenticated request, refreshes once and retries with the new token', async () => {
    (globalThis.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHORIZED' } }))
      .mockResolvedValueOnce(jsonResponse(200, { id: '1' }));
    mockedRefreshAccessToken.mockImplementation(async () => {
      useAuthStore.getState().signIn('rotated-access-token');
      return 'rotated-access-token';
    });

    const result = await apiFetch('/me');

    expect(result).toEqual({ id: '1' });
    expect(mockedRefreshAccessToken).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    const [, secondInit] = (globalThis.fetch as jest.Mock).mock.calls[1];
    expect(secondInit.headers.Authorization).toBe('Bearer rotated-access-token');
  });

  it('does not attempt a refresh for a 401 on a public (auth: false) request, e.g. wrong login credentials', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } }),
    );

    await expect(
      apiFetch('/auth/login', { method: 'POST', body: {}, auth: false }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

    expect(mockedRefreshAccessToken).not.toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('gives up after a single retry instead of looping when the retried request is still 401', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(jsonResponse(401, { error: { code: 'UNAUTHORIZED' } }));
    mockedRefreshAccessToken.mockResolvedValue('rotated-access-token');

    await expect(apiFetch('/me')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

    expect(mockedRefreshAccessToken).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('propagates the sign-out error when the refresh itself fails', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHORIZED' } }));
    mockedRefreshAccessToken.mockRejectedValue(new ApiError('Session expired', 'UNAUTHORIZED', 401));

    await expect(apiFetch('/me')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
