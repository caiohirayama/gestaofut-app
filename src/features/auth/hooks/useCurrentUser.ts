import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/services/api/endpoints/auth';
import { queryKeys } from '@/services/api/query-keys';
import { useAuthStore } from '@/store/auth-store';

export function useCurrentUser() {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: ({ signal }) => getMe(signal),
    enabled: status === 'authenticated',
  });
}
