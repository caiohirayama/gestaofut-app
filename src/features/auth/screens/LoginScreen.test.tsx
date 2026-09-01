import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as secureStorage from '@/services/secure-storage';
import * as authEndpoints from '@/services/api/endpoints/auth';
import { useAuthStore } from '@/store/auth-store';
import { LoginScreen } from './LoginScreen';

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args), push: (...args: unknown[]) => mockPush(...args) },
  useLocalSearchParams: () => ({}),
}));

function renderLoginScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LoginScreen />
    </QueryClientProvider>,
  );
}

const validUser = {
  id: '1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: null, avatarUrl: null,
  status: 'ACTIVE' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('LoginScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'unauthenticated', accessToken: null });
    mockReplace.mockReset();
    mockPush.mockReset();
    jest.spyOn(secureStorage, 'setSecureItem').mockResolvedValue();
  });

  it('keeps the submit button disabled until email and password are valid', async () => {
    renderLoginScreen();

    const button = screen.getByRole('button', { name: 'Entrar' });
    expect(button.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(screen.getByPlaceholderText('voce@email.com'), 'ada@example.com');
    fireEvent(screen.getByPlaceholderText('voce@email.com'), 'blur');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'supersecret123');
    fireEvent(screen.getByPlaceholderText('••••••••'), 'blur');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Entrar' }).props.accessibilityState.disabled).toBe(
        false,
      ),
    );
  });

  it('signs in, persists the refresh token, and navigates on success', async () => {
    jest.spyOn(authEndpoints, 'login').mockResolvedValue({
      user: validUser,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    renderLoginScreen();
    fireEvent.changeText(screen.getByPlaceholderText('voce@email.com'), 'ada@example.com');
    fireEvent(screen.getByPlaceholderText('voce@email.com'), 'blur');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'supersecret123');
    fireEvent(screen.getByPlaceholderText('••••••••'), 'blur');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Entrar' }).props.accessibilityState.disabled).toBe(
        false,
      ),
    );
    fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(app)'));
    expect(secureStorage.setSecureItem).toHaveBeenCalledWith(
      secureStorage.SECURE_KEYS.refreshToken,
      'refresh-token',
    );
    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      accessToken: 'access-token',
    });
  });

  it('shows a generic error and does not navigate on invalid credentials', async () => {
    const { ApiError } = jest.requireActual('@/services/api/errors');
    jest
      .spyOn(authEndpoints, 'login')
      .mockRejectedValue(new ApiError('Invalid email or password', 'UNAUTHORIZED', 401));

    renderLoginScreen();
    fireEvent.changeText(screen.getByPlaceholderText('voce@email.com'), 'ada@example.com');
    fireEvent(screen.getByPlaceholderText('voce@email.com'), 'blur');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'wrong-password');
    fireEvent(screen.getByPlaceholderText('••••••••'), 'blur');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Entrar' }).props.accessibilityState.disabled).toBe(
        false,
      ),
    );
    fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('E-mail ou senha inválidos.')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('toggles password visibility', () => {
    renderLoginScreen();

    const passwordInput = screen.getByPlaceholderText('••••••••');
    expect(passwordInput.props.secureTextEntry).toBe(true);

    fireEvent.press(screen.getByLabelText('Mostrar senha'));

    expect(screen.getByPlaceholderText('••••••••').props.secureTextEntry).toBe(false);
  });
});
