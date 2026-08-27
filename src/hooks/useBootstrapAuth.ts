import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { getSecureItem, SECURE_KEYS } from '@/services/secure-storage';
import { refreshAccessToken } from '@/services/api/token-refresh';

/**
 * Runs once at app start: reads any persisted refresh token from
 * SecureStore and, if present, rotates it for a fresh access/refresh pair
 * (this both validates *and* renews the session in one call — there's no
 * separate "is this token still good" check). Flips `useAuthStore.status`
 * to `authenticated`/`unauthenticated` accordingly so the root layout can
 * hold the splash screen until it resolves and `app/index.tsx` can decide
 * which route group to show.
 *
 * A network/timeout failure here leaves the stored refresh token untouched
 * (see token-refresh.ts) and only marks the session unauthenticated for
 * this app launch; only an explicit rejection from the API clears it.
 */
export function useBootstrapAuth(): void {
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const refreshToken = await getSecureItem(SECURE_KEYS.refreshToken).catch(() => null);
      if (!refreshToken) {
        if (!cancelled) useAuthStore.getState().signOut();
        return;
      }

      try {
        await refreshAccessToken();
      } catch {
        if (!cancelled) useAuthStore.getState().signOut();
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);
}
