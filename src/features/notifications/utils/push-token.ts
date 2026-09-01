import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { PushPlatform } from '@/services/api/endpoints/notifications';

export type GetExpoPushTokenResult =
  | { status: 'obtained'; token: string; platform: PushPlatform }
  | { status: 'unsupported-device' }
  | { status: 'missing-project-id' }
  | { status: 'error'; error: unknown };

/**
 * `getExpoPushTokenAsync` needs the EAS project id — normally auto-filled
 * into `app.json`'s `expo.extra.eas.projectId` by `eas init`. Reading it
 * defensively (both known locations) means this never throws just because
 * the project hasn't been linked to EAS yet; it surfaces as
 * `'missing-project-id'` instead, a state the UI can explain.
 */
function resolveProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Obtains this device's Expo Push Token — the value gestaofut-api stores
 * per docs/notifications.md, "PUSH" and uses to address a push through
 * Expo's own delivery service. Requires a physical device (`Device.isDevice`
 * — simulators/emulators have no push capability) and a resolvable EAS
 * project id.
 */
export async function getExpoPushToken(): Promise<GetExpoPushTokenResult> {
  if (!Device.isDevice) {
    return { status: 'unsupported-device' };
  }

  const projectId = resolveProjectId();
  if (!projectId) {
    return { status: 'missing-project-id' };
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { status: 'obtained', token: data, platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID' };
  } catch (error) {
    return { status: 'error', error };
  }
}
