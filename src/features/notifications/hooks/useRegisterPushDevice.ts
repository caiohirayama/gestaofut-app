import { useCallback, useState } from 'react';
import { getApiErrorMessage } from '@/services/api/error-message';
import { registerPushSubscription, revokePushSubscription } from '@/services/api/endpoints/notifications';
import { deleteSecureItem, getSecureItem, setSecureItem, SECURE_KEYS } from '@/services/secure-storage';
import { getExpoPushToken } from '../utils/push-token';

export type RegisterPushDeviceStage =
  | 'idle'
  | 'registering'
  | 'registered'
  | 'unsupported-device'
  | 'missing-project-id'
  | 'error';

export interface UseRegisterPushDeviceResult {
  stage: RegisterPushDeviceStage;
  errorMessage: string | null;
  isRevoking: boolean;
  /**
   * "DEVICE: registrar Expo Push Token na API após autorização" — obtains
   * this device's token and calls `POST /me/push-subscriptions`, which
   * upserts by token server-side (see gestaofut-api docs/notifications.md,
   * "PUSH"), so calling this again for the same device is always safe:
   * "atualizar" a stale/rotated token is the exact same call as the first
   * registration.
   */
  register: () => Promise<void>;
  /**
   * "revogar quando necessário" — revokes the subscription this device last
   * registered (remembered locally only as an id to revoke, not as proof
   * push is enabled) and forgets it. A best-effort call: even if the API
   * request fails (subscription already gone, network down), the local
   * pointer is still cleared so the UI never gets stuck offering to
   * "disable" something it can't reach.
   */
  revoke: () => Promise<void>;
}

/**
 * Extracted as a plain function (not just inlined in the hook below) so
 * `useLogout` can also call it — logging out must revoke this device's
 * push subscription too, or a signed-out user keeps receiving pushes
 * about a group they can no longer see in the app (see docs/security-review.md,
 * "Push"). Best-effort, same as the hook's own `revoke`.
 */
export async function revokeCurrentDevicePushSubscription(): Promise<void> {
  const subscriptionId = await getSecureItem(SECURE_KEYS.pushSubscriptionId).catch(() => null);
  if (subscriptionId) {
    await revokePushSubscription(subscriptionId).catch(() => {});
    await deleteSecureItem(SECURE_KEYS.pushSubscriptionId).catch(() => {});
  }
}

export function useRegisterPushDevice(): UseRegisterPushDeviceResult {
  const [stage, setStage] = useState<RegisterPushDeviceStage>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const register = useCallback(async () => {
    setErrorMessage(null);
    setStage('registering');

    const tokenResult = await getExpoPushToken();
    if (tokenResult.status !== 'obtained') {
      if (tokenResult.status === 'error') {
        setErrorMessage('Não foi possível obter o token de notificações deste dispositivo.');
        setStage('error');
      } else {
        setStage(tokenResult.status);
      }
      return;
    }

    try {
      const subscription = await registerPushSubscription({ token: tokenResult.token, platform: tokenResult.platform });
      await setSecureItem(SECURE_KEYS.pushSubscriptionId, subscription.id);
      setStage('registered');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
      setStage('error');
    }
  }, []);

  const revoke = useCallback(async () => {
    setIsRevoking(true);
    try {
      await revokeCurrentDevicePushSubscription();
      setStage('idle');
    } finally {
      setIsRevoking(false);
    }
  }, []);

  return { stage, errorMessage, isRevoking, register, revoke };
}
