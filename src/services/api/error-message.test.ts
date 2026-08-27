import { ApiError } from './errors';
import { getApiErrorMessage } from './error-message';

describe('getApiErrorMessage', () => {
  it('maps rate limiting, network, timeout and validation to generic, context-free messages', () => {
    expect(getApiErrorMessage(new ApiError('x', 'TOO_MANY_REQUESTS', 429))).toBe(
      'Muitas tentativas. Aguarde um instante e tente novamente.',
    );
    expect(getApiErrorMessage(new ApiError('x', 'NETWORK_ERROR'))).toBe(
      'Não foi possível conectar ao servidor. Verifique sua internet.',
    );
    expect(getApiErrorMessage(new ApiError('x', 'TIMEOUT'))).toBe('A requisição demorou muito. Tente novamente.');
    expect(getApiErrorMessage(new ApiError('x', 'VALIDATION_ERROR', 400))).toBe('Verifique os dados informados.');
  });

  it('falls back to the backend message for FORBIDDEN/NOT_FOUND without an override', () => {
    expect(getApiErrorMessage(new ApiError('Group not found', 'NOT_FOUND', 404))).toBe('Group not found');
    expect(getApiErrorMessage(new ApiError('Your account has been blocked.', 'FORBIDDEN', 403))).toBe(
      'Your account has been blocked.',
    );
  });

  it('uses a caller-provided override when given, taking priority over the generic message', () => {
    expect(
      getApiErrorMessage(new ApiError('Invalid email or password', 'UNAUTHORIZED', 401), {
        UNAUTHORIZED: 'E-mail ou senha inválidos.',
      }),
    ).toBe('E-mail ou senha inválidos.');

    expect(
      getApiErrorMessage(new ApiError('duplicate', 'CONFLICT', 409), { CONFLICT: 'Este e-mail já está cadastrado.' }),
    ).toBe('Este e-mail já está cadastrado.');
  });

  it('falls back to a generic message for an unmapped code with no override', () => {
    expect(getApiErrorMessage(new ApiError('x', 'UNAUTHORIZED', 401))).toBe('Algo deu errado. Tente novamente.');
  });

  it('falls back to a generic message for a non-ApiError', () => {
    expect(getApiErrorMessage(new Error('boom'))).toBe('Algo deu errado. Tente novamente.');
  });
});
