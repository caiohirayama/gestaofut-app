import { useAuthStore } from './auth-store';

describe('auth-store', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'loading', accessToken: null });
  });

  it('starts loading with no access token', () => {
    const state = useAuthStore.getState();
    expect(state.status).toBe('loading');
    expect(state.accessToken).toBeNull();
  });

  it('signIn stores the access token and flips status to authenticated', () => {
    useAuthStore.getState().signIn('new-access-token');
    const state = useAuthStore.getState();
    expect(state.status).toBe('authenticated');
    expect(state.accessToken).toBe('new-access-token');
  });

  it('signIn can be called again to rotate the access token without changing status', () => {
    useAuthStore.getState().signIn('first-token');
    useAuthStore.getState().signIn('rotated-token');
    const state = useAuthStore.getState();
    expect(state.status).toBe('authenticated');
    expect(state.accessToken).toBe('rotated-token');
  });

  it('signOut clears the access token and flips status to unauthenticated', () => {
    useAuthStore.getState().signIn('token');
    useAuthStore.getState().signOut();
    const state = useAuthStore.getState();
    expect(state.status).toBe('unauthenticated');
    expect(state.accessToken).toBeNull();
  });
});
