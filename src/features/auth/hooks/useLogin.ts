import { useMutation } from '@tanstack/react-query';
import { login } from '@/services/api/endpoints/auth';
import { setSecureItem, SECURE_KEYS } from '@/services/secure-storage';
import { useAuthStore } from '@/store/auth-store';

export function useLogin() {
  return useMutation({
    mutationFn: login,
    onSuccess: async (result) => {
      await setSecureItem(SECURE_KEYS.refreshToken, result.refreshToken);
      useAuthStore.getState().signIn(result.accessToken);
    },
  });
}
