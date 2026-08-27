import { ApiError, type ApiErrorCode } from './errors';

const GENERIC_MESSAGES: Partial<Record<ApiErrorCode, string>> = {
  TOO_MANY_REQUESTS: 'Muitas tentativas. Aguarde um instante e tente novamente.',
  NETWORK_ERROR: 'Não foi possível conectar ao servidor. Verifique sua internet.',
  TIMEOUT: 'A requisição demorou muito. Tente novamente.',
  VALIDATION_ERROR: 'Verifique os dados informados.',
  INTERNAL_SERVER_ERROR: 'Algo deu errado no servidor. Tente novamente.',
};

const FALLBACK_MESSAGE = 'Algo deu errado. Tente novamente.';

/**
 * Maps an `ApiError` to copy safe to show a user. Codes whose meaning is
 * context-free (rate limiting, network, validation, ...) get a shared
 * default here. Codes whose real-world meaning depends on the action being
 * performed — `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `NOT_FOUND` — should
 * be passed as `overrides` by the caller (e.g. `UNAUTHORIZED` means "wrong
 * password" on a login form but "session expired" elsewhere); without an
 * override, `FORBIDDEN`/`NOT_FOUND` fall back to the backend's own message
 * (already written to be user-safe), and everything else falls back to a
 * generic message.
 */
export function getApiErrorMessage(
  error: unknown,
  overrides: Partial<Record<ApiErrorCode, string>> = {},
): string {
  if (error instanceof ApiError) {
    if (overrides[error.code]) {
      return overrides[error.code]!;
    }
    if (GENERIC_MESSAGES[error.code]) {
      return GENERIC_MESSAGES[error.code]!;
    }
    if (error.code === 'FORBIDDEN' || error.code === 'NOT_FOUND') {
      return error.message || FALLBACK_MESSAGE;
    }
    return FALLBACK_MESSAGE;
  }
  return FALLBACK_MESSAGE;
}
