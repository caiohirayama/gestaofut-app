import { create } from 'zustand';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  /** Access token, in memory only — never persisted (SecureStore/AsyncStorage/disk). */
  accessToken: string | null;
  /** Starts (or refreshes) an authenticated session with a fresh access token. */
  signIn: (accessToken: string) => void;
  signOut: () => void;
}

/**
 * Local session state only — never a cache for server data (that's
 * TanStack Query's job). The backend remains the sole source of truth for
 * authorization; `status`/`accessToken` here only gate client-side
 * navigation. The refresh token never lives here — it's SecureStore-only
 * (see src/services/secure-storage.ts).
 */
export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  accessToken: null,
  signIn: (accessToken) => set({ accessToken, status: 'authenticated' }),
  signOut: () => set({ accessToken: null, status: 'unauthenticated' }),
}));
