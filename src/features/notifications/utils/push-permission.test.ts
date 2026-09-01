import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getPushPermissionStatus, requestPushPermission } from './push-permission';

describe('getPushPermissionStatus — PERMISSÕES', () => {
  it('reads the current OS status without prompting', async () => {
    const getPermissionsSpy = jest.spyOn(Notifications, 'getPermissionsAsync').mockResolvedValue({ status: 'undetermined' } as never);
    const requestSpy = jest.spyOn(Notifications, 'requestPermissionsAsync');

    const status = await getPushPermissionStatus();

    expect(status).toBe('undetermined');
    expect(getPermissionsSpy).toHaveBeenCalledTimes(1);
    expect(requestSpy).not.toHaveBeenCalled();
  });

  it.each(['granted', 'denied', 'undetermined'] as const)('passes through a %s status verbatim', async (value) => {
    jest.spyOn(Notifications, 'getPermissionsAsync').mockResolvedValue({ status: value } as never);

    expect(await getPushPermissionStatus()).toBe(value);
  });
});

describe('requestPushPermission — PERMISSÕES', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Platform.OS = originalPlatform;
  });

  it('prompts the OS dialog and returns the resulting status', async () => {
    const requestSpy = jest.spyOn(Notifications, 'requestPermissionsAsync').mockResolvedValue({ status: 'granted' } as never);

    const status = await requestPushPermission();

    expect(status).toBe('granted');
    expect(requestSpy).toHaveBeenCalledTimes(1);
  });

  it('creates the Android notification channel before prompting, on Android', async () => {
    Platform.OS = 'android';
    const channelSpy = jest.spyOn(Notifications, 'setNotificationChannelAsync').mockResolvedValue(undefined as never);
    jest.spyOn(Notifications, 'requestPermissionsAsync').mockResolvedValue({ status: 'granted' } as never);

    await requestPushPermission();

    expect(channelSpy).toHaveBeenCalledWith('default', expect.objectContaining({ importance: Notifications.AndroidImportance.DEFAULT }));
  });

  it('never touches the Android channel on iOS', async () => {
    Platform.OS = 'ios';
    const channelSpy = jest.spyOn(Notifications, 'setNotificationChannelAsync').mockResolvedValue(undefined as never);
    jest.spyOn(Notifications, 'requestPermissionsAsync').mockResolvedValue({ status: 'granted' } as never);

    await requestPushPermission();

    expect(channelSpy).not.toHaveBeenCalled();
  });

  it('returns denied when the user declines', async () => {
    jest.spyOn(Notifications, 'requestPermissionsAsync').mockResolvedValue({ status: 'denied' } as never);

    expect(await requestPushPermission()).toBe('denied');
  });
});
