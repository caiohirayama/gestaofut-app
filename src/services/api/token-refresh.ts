import { useAuthStore } from '@/store/auth-store';
import { deleteSecureItem, getSecureItem, setSecureItem, SECURE_KEYS } from '@/services/secure-storage';
import { API_BASE_URL } from './env';
import { ApiError } from './errors';
import type { AuthResult } from './endpoints/auth';

let refreshPromise: Promise<string> | null = null;

/**
 * Rotates the refresh token and updates the in-memory access token +
 * SecureStore. Deliberately bypasses `apiFetch` (calls `fetch` directly):
 * `apiFetch`'s own 401 handling calls back into this function, and going
 * through it here would be circular.
 *
 * Concurrent callers share one in-flight request, so a burst of 401s across
 * several parallel requests only ever triggers a single
 * `POST /auth/refresh` — see docs/api-client.md.
 */
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function performRefresh(): Promise<string> {
  const refreshToken = await getSecureItem(SECURE_KEYS.refreshToken);
  if (!refreshToken) {
    useAuthStore.getState().signOut();
    throw new ApiError('No refresh token available', 'UNAUTHORIZED', 401);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch (error) {
    // Server unreachable: leave the stored refresh token untouched so a
    // later attempt (e.g. next app start) can still try again — only an
    // explicit rejection from the API (below) invalidates the session.
    throw new ApiError('Network request failed', 'NETWORK_ERROR', null, error);
  }

  if (!response.ok) {
    await deleteSecureItem(SECURE_KEYS.refreshToken);
    useAuthStore.getState().signOut();
    throw new ApiError('Session expired', 'UNAUTHORIZED', response.status);
  }

  const data = (await response.json()) as AuthResult;
  await setSecureItem(SECURE_KEYS.refreshToken, data.refreshToken);
  useAuthStore.getState().signIn(data.accessToken);
  return data.accessToken;
}
