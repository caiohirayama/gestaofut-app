import { useEffect } from 'react';
import { usePushPermission } from './usePushPermission';
import { useRegisterPushDevice } from './useRegisterPushDevice';

/**
 * "Atualizar quando necessário" (see docs/notifications.md, "DEVICE"): once
 * the app starts, if the OS permission is already `granted` from a
 * previous session, silently (re)registers this device's token — this
 * never itself prompts for permission (see `usePushPermission`/
 * "PERMISSÃO"), it only re-affirms a token the user already agreed to.
 * Covers a rotated/reinstalled token without the user having to revisit
 * the notification center to notice anything changed.
 */
export function useAutoRegisterPushDevice(): void {
  const { status } = usePushPermission();
  const { register } = useRegisterPushDevice();

  useEffect(() => {
    if (status === 'granted') {
      void register();
    }
  }, [status, register]);
}
