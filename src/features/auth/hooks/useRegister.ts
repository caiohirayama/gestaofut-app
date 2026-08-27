import { useMutation } from '@tanstack/react-query';
import { register } from '@/services/api/endpoints/auth';
import type { RegisterFormValues } from '../schemas/register-schema';

/**
 * Registration never signs the user in — it's a separate step from login
 * (see gestaofut-api docs/auth.md). Deliberately destructures out
 * `confirmPassword`: it's a client-only field, and the API rejects unknown
 * body keys (`additionalProperties: false`), so it must never be forwarded.
 */
export function useRegister() {
  return useMutation({
    mutationFn: ({ name, email, password }: RegisterFormValues) =>
      register({ name, email, password }),
  });
}
