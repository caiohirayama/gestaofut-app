import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getExpoPushToken } from './push-token';

describe('getExpoPushToken — TOKEN REGISTRATION', () => {
  const originalPlatform = Platform.OS;
  const originalExtra = Constants.expoConfig?.extra;

  afterEach(() => {
    Platform.OS = originalPlatform;
    if (Constants.expoConfig) {
      Constants.expoConfig.extra = originalExtra;
    }
  });

  it('obtains the token on a physical device with a resolvable EAS project id', async () => {
    Platform.OS = 'ios';
    const tokenSpy = jest.spyOn(Notifications, 'getExpoPushTokenAsync').mockResolvedValue({ data: 'ExponentPushToken[abc]', type: 'expo' } as never);

    const result = await getExpoPushToken();

    expect(result).toEqual({ status: 'obtained', token: 'ExponentPushToken[abc]', platform: 'IOS' });
    expect(tokenSpy).toHaveBeenCalledWith({ projectId: 'test-project-id' });
  });

  it('maps the platform to ANDROID on Android', async () => {
    Platform.OS = 'android';
    jest.spyOn(Notifications, 'getExpoPushTokenAsync').mockResolvedValue({ data: 'ExponentPushToken[abc]', type: 'expo' } as never);

    const result = await getExpoPushToken();

    expect(result).toMatchObject({ status: 'obtained', platform: 'ANDROID' });
  });

  it('reports missing-project-id when the EAS project id cannot be resolved', async () => {
    if (Constants.expoConfig) {
      Constants.expoConfig.extra = {};
    }
    const tokenSpy = jest.spyOn(Notifications, 'getExpoPushTokenAsync');

    const result = await getExpoPushToken();

    expect(result).toEqual({ status: 'missing-project-id' });
    expect(tokenSpy).not.toHaveBeenCalled();
  });

  it('reports an error result when Expo itself rejects, without throwing', async () => {
    const failure = new Error('Expo push service unreachable');
    jest.spyOn(Notifications, 'getExpoPushTokenAsync').mockRejectedValue(failure);

    const result = await getExpoPushToken();

    expect(result).toEqual({ status: 'error', error: failure });
  });
});
