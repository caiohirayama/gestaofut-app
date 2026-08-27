import { useAuthStore } from './auth-store';

describe('auth-store', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'idle', token: null });
  });

  it('starts idle with no token', () => {
    const state = useAuthStore.getState();
    expect(state.status).toBe('idle');
    expect(state.token).toBeNull();
  });

  it('hydrate marks unauthenticated when there is no stored token', () => {
    useAuthStore.getState().hydrate(null);
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('hydrate marks authenticated when a token is found', () => {
    useAuthStore.getState().hydrate('persisted-token');
    const state = useAuthStore.getState();
    expect(state.status).toBe('authenticated');
    expect(state.token).toBe('persisted-token');
  });

  it('signIn stores the token and flips status to authenticated', () => {
    useAuthStore.getState().signIn('new-token');
    const state = useAuthStore.getState();
    expect(state.status).toBe('authenticated');
    expect(state.token).toBe('new-token');
  });

  it('signOut clears the token and flips status to unauthenticated', () => {
    useAuthStore.getState().signIn('token');
    useAuthStore.getState().signOut();
    const state = useAuthStore.getState();
    expect(state.status).toBe('unauthenticated');
    expect(state.token).toBeNull();
  });
});
