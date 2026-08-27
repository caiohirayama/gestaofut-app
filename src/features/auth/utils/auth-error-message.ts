import { ApiError } from '@/services/api/errors';

/**
 * Maps an auth-flow failure to copy safe to show a user. Deliberately
 * generic for credential/lookup failures (`UNAUTHORIZED`) so the UI never
 * discloses whether a given e-mail is registered — the backend already
 * applies the same non-disclosure policy (see gestaofut-api docs/auth.md);
 * this only has to not undo it.
 */
export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
        return 'E-mail ou senha inválidos.';
      case 'FORBIDDEN':
        // The backend only reveals account status (blocked/inactive) after a
        // correct password, so its message is already safe to show as-is.
        return error.message || 'Não foi possível acessar sua conta.';
      case 'CONFLICT':
        return 'Este e-mail já está cadastrado.';
      case 'VALIDATION_ERROR':
        return 'Verifique os dados informados.';
      case 'TOO_MANY_REQUESTS':
        return 'Muitas tentativas. Aguarde um instante e tente novamente.';
      case 'NETWORK_ERROR':
        return 'Não foi possível conectar ao servidor. Verifique sua internet.';
      case 'TIMEOUT':
        return 'A requisição demorou muito. Tente novamente.';
      default:
        return 'Algo deu errado. Tente novamente.';
    }
  }
  return 'Algo deu errado. Tente novamente.';
}
