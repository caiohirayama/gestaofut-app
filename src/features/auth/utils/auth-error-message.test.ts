import { ApiError } from '@/services/api/errors';
import { getAuthErrorMessage } from './auth-error-message';

describe('getAuthErrorMessage', () => {
  it('gives a generic message for invalid credentials (never reveals whether the e-mail exists)', () => {
    const error = new ApiError('Invalid email or password', 'UNAUTHORIZED', 401);
    expect(getAuthErrorMessage(error)).toBe('E-mail ou senha inválidos.');
  });

  it('passes through the backend message for a forbidden (blocked/inactive) account', () => {
    const error = new ApiError('Your account has been blocked.', 'FORBIDDEN', 403);
    expect(getAuthErrorMessage(error)).toBe('Your account has been blocked.');
  });

  it('maps a duplicate e-mail conflict', () => {
    const error = new ApiError('Email already in use', 'CONFLICT', 409);
    expect(getAuthErrorMessage(error)).toBe('Este e-mail já está cadastrado.');
  });

  it('maps rate limiting', () => {
    const error = new ApiError('Too many requests', 'TOO_MANY_REQUESTS', 429);
    expect(getAuthErrorMessage(error)).toBe(
      'Muitas tentativas. Aguarde um instante e tente novamente.',
    );
  });

  it('maps network failures', () => {
    const error = new ApiError('Network request failed', 'NETWORK_ERROR');
    expect(getAuthErrorMessage(error)).toBe(
      'Não foi possível conectar ao servidor. Verifique sua internet.',
    );
  });

  it('falls back to a generic message for unknown errors', () => {
    expect(getAuthErrorMessage(new Error('boom'))).toBe('Algo deu errado. Tente novamente.');
  });
});
