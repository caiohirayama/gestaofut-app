import * as Notifications from 'expo-notifications';
import { getExpoPushToken } from './push-token';

// `isDevice` is a real constant `expo-device` snapshots once at module load
// from a native module — nothing in production code ever flips it at
// runtime, so the idiomatic (and only truly reliable) way to test the
// "simulator/emulator" branch is a dedicated file-level override, not a
// runtime mutation of the already-imported value (see push-token.test.ts
// for the `isDevice: true` scenarios, using the default from jest.setup.js).
jest.mock('expo-device', () => ({ isDevice: false }));

describe('getExpoPushToken — TOKEN REGISTRATION (simulador/emulador)', () => {
  it('reports unsupported-device without calling Expo at all', async () => {
    const tokenSpy = jest.spyOn(Notifications, 'getExpoPushTokenAsync');

    const result = await getExpoPushToken();

    expect(result).toEqual({ status: 'unsupported-device' });
    expect(tokenSpy).not.toHaveBeenCalled();
  });
});
