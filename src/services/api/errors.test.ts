import { ApiError } from './errors';

describe('ApiError', () => {
  it('carries status, code and details', () => {
    const error = new ApiError('Not found', 'NOT_FOUND', 404, { resource: 'match' });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.message).toBe('Not found');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.status).toBe(404);
    expect(error.details).toEqual({ resource: 'match' });
  });

  it('defaults status to null when not provided', () => {
    const error = new ApiError('Network down', 'NETWORK_ERROR');
    expect(error.status).toBeNull();
  });
});
