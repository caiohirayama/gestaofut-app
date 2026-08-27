import { z } from 'zod';

/**
 * Only genuinely public values may be read here — anything under
 * `EXPO_PUBLIC_*` is bundled into the client binary and readable by anyone
 * who inspects the app. Never add secrets/API keys to this file.
 */
const publicEnvSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url(),
});

function loadPublicEnv() {
  const parsed = publicEnvSchema.safeParse({
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid app configuration: EXPO_PUBLIC_API_URL is missing or not a valid URL. ` +
        `Copy .env.example to .env and set it. (${parsed.error.issues[0]?.message ?? ''})`,
    );
  }

  return parsed.data;
}

const publicEnv = loadPublicEnv();

/** Origin of the API (no path), e.g. "http://localhost:3000". */
export const API_ORIGIN = publicEnv.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');

/** Base URL for versioned business endpoints. Not env-driven: it's an API contract detail. */
export const API_BASE_URL = `${API_ORIGIN}/api/v1`;
