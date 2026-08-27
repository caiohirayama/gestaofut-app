export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_SERVER_ERROR'
  | 'UNKNOWN_ERROR';

/** Standardized error shape for every failure raised by the API client. */
export class ApiError extends Error {
  readonly status: number | null;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(
    message: string,
    code: ApiErrorCode,
    status: number | null = null,
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
