import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import * as authEndpoints from '@/services/api/endpoints/auth';
import { useRegister } from './useRegister';

function wrapper({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useRegister', () => {
  it('never forwards confirmPassword to the API (additionalProperties: false on the backend)', async () => {
    const registerSpy = jest.spyOn(authEndpoints, 'register').mockResolvedValue({
      user: {
        id: '1',
        name: 'Ada',
        email: 'ada@example.com',
        phone: null,
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    const { result } = renderHook(() => useRegister(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        name: 'Ada',
        email: 'ada@example.com',
        password: 'supersecret123',
        confirmPassword: 'supersecret123',
      });
    });

    expect(registerSpy).toHaveBeenCalledWith({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'supersecret123',
    });
  });
});
