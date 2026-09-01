import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type PushPermissionStatus = 'granted' | 'denied' | 'undetermined';

const ANDROID_DEFAULT_CHANNEL_ID = 'default';

/**
 * Android requires a notification channel to exist before a notification
 * can actually be shown — separate from (and unrelated to) the POST_NOTIFICATIONS
 * runtime permission itself. Idempotent (`setNotificationChannelAsync`
 * upserts), so calling this on every check/request is harmless. A no-op on
 * iOS, which has no channel concept.
 */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await Notifications.setNotificationChannelAsync(ANDROID_DEFAULT_CHANNEL_ID, {
    name: 'Geral',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Reads the current OS permission status without prompting the user. */
export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/**
 * Prompts the OS permission dialog. Callers decide *when* this fires (see
 * docs/notifications.md, "PERMISSÃO") — this function itself has no
 * opinion, it just wraps the OS call and makes sure Android has a channel
 * ready to actually show something once granted.
 */
export async function requestPushPermission(): Promise<PushPermissionStatus> {
  await ensureAndroidChannel();
  const { status } = await Notifications.requestPermissionsAsync();
  return status;
}
