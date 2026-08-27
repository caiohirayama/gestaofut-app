import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { getSecureItem, SECURE_KEYS } from '@/services/secure-storage';

/**
 * Reads any persisted token from SecureStore once at app start and hydrates
 * the auth store with it. Returns whether that check has finished, so the
 * root layout can hold the splash screen until it has (avoids a flash of
 * the wrong (auth)/(app) group).
 */
export function useBootstrapAuth(): boolean {
  const [isReady, setIsReady] = useState(false);
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    let cancelled = false;

    getSecureItem(SECURE_KEYS.authToken)
      .then((token) => {
        if (!cancelled) hydrate(token);
      })
      .catch(() => {
        if (!cancelled) hydrate(null);
      })
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  return isReady;
}
