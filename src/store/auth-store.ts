import { create } from 'zustand';

export type AuthStatus = 'idle' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  token: string | null;
  /** Called once at boot after reading SecureStore, before first render decision. */
  hydrate: (token: string | null) => void;
  signIn: (token: string) => void;
  signOut: () => void;
}

/**
 * Local session state only — never a cache for server data (that's
 * TanStack Query's job). The backend remains the sole source of truth for
 * authorization; `status`/`token` here only gate client-side navigation.
 */
export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  token: null,
  hydrate: (token) => set({ token, status: token ? 'authenticated' : 'unauthenticated' }),
  signIn: (token) => set({ token, status: 'authenticated' }),
  signOut: () => set({ token: null, status: 'unauthenticated' }),
}));
