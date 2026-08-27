import { getApiErrorMessage } from '@/services/api/error-message';

/**
 * Auth-flow-specific wording for the codes whose meaning depends on
 * context. `UNAUTHORIZED` is deliberately generic ("wrong e-mail or
 * password") so the UI never discloses whether a given e-mail is
 * registered — the backend already applies the same non-disclosure policy
 * (see gestaofut-api docs/auth.md); this only has to not undo it.
 * `FORBIDDEN` (blocked/inactive account) and everything else fall back to
 * `getApiErrorMessage`'s defaults.
 */
export function getAuthErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, {
    UNAUTHORIZED: 'E-mail ou senha inválidos.',
    CONFLICT: 'Este e-mail já está cadastrado.',
  });
}
