import { z } from 'zod';
import { API_ORIGIN } from '../env';
import { ApiError } from '../errors';

const healthResponseSchema = z.object({
  status: z.literal('ok'),
  uptime: z.number(),
  timestamp: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

/**
 * Hits the API's unversioned `/health` liveness probe directly (not through
 * `apiFetch`/`API_BASE_URL`): it's an ops endpoint, not a business one, and
 * intentionally requires no Authorization header.
 */
export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_ORIGIN}/health`, { signal });
  } catch (error) {
    throw new ApiError('Could not reach the API', 'NETWORK_ERROR', null, error);
  }

  if (!response.ok) {
    throw new ApiError(`API returned status ${response.status}`, 'UNKNOWN_ERROR', response.status);
  }

  const json: unknown = await response.json();
  const parsed = healthResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError(
      'Unexpected /health response shape',
      'UNKNOWN_ERROR',
      response.status,
      parsed.error,
    );
  }

  return parsed.data;
}
