import * as SecureStore from 'expo-secure-store';

/**
 * Thin wrapper around Expo SecureStore. Sensitive tokens must go through
 * here — never AsyncStorage/plain state persistence. Keys must match
 * `[A-Za-z0-9._-]+` per SecureStore's constraints.
 */
export const SECURE_KEYS = {
  authToken: 'auth_token',
} as const;

export async function getSecureItem(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function deleteSecureItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
