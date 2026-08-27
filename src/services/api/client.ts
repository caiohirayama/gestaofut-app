import { useAuthStore } from '@/store/auth-store';
import { API_BASE_URL } from './env';
import { ApiError, type ApiErrorCode } from './errors';

const DEFAULT_TIMEOUT_MS = 10_000;

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  /** Optional external abort signal, e.g. from TanStack Query's queryFn context. */
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Skip Authorization header injection (e.g. for public endpoints). */
  auth?: boolean;
}

interface ErrorResponseBody {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

function isKnownErrorCode(code: string | undefined): code is ApiErrorCode {
  return (
    !!code &&
    [
      'VALIDATION_ERROR',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'NOT_FOUND',
      'CONFLICT',
      'INTERNAL_SERVER_ERROR',
    ].includes(code)
  );
}

/**
 * Centralized HTTP client for versioned business endpoints
 * (`${API_BASE_URL}${path}`). Handles Authorization injection, timeout,
 * cancellation and standardized error mapping. Prefer this over calling
 * `fetch` directly anywhere in the app.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    headers,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    auth = true,
  } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
  const onExternalAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', onExternalAbort);

  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };
  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }
  if (auth) {
    const token = useAuthStore.getState().token;
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      let payload: ErrorResponseBody = {};
      try {
        payload = (await response.json()) as ErrorResponseBody;
      } catch {
        // response had no JSON body; fall through with a generic message
      }
      const code = isKnownErrorCode(payload.error?.code)
        ? (payload.error!.code! as ApiErrorCode)
        : 'UNKNOWN_ERROR';
      throw new ApiError(
        payload.error?.message ?? `Request failed with status ${response.status}`,
        code,
        response.status,
        payload.error?.details,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (controller.signal.aborted) {
      const reason = controller.signal.reason;
      if (signal?.aborted) {
        throw new ApiError('Request was cancelled', 'CANCELLED');
      }
      throw new ApiError('Request timed out', 'TIMEOUT', null, reason);
    }
    throw new ApiError('Network request failed', 'NETWORK_ERROR', null, error);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}
