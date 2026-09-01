import { useCallback, useEffect, useState } from 'react';
import { getPushPermissionStatus, requestPushPermission, type PushPermissionStatus } from '../utils/push-permission';

export interface UsePushPermissionResult {
  /** `'loading'` only for the very first check, right after mount. */
  status: PushPermissionStatus | 'loading';
  /** Re-reads the OS status without prompting — useful after the app returns from background (the user may have changed it in Settings). */
  refresh: () => Promise<void>;
  /** Prompts the OS permission dialog. Callers decide *when* to call this — see docs/notifications.md, "PERMISSÃO". */
  request: () => Promise<PushPermissionStatus>;
}

/** Generic engine over the OS push permission — no UI, no API calls (see `useRegisterPushDevice` for that). */
export function usePushPermission(): UsePushPermissionResult {
  const [status, setStatus] = useState<PushPermissionStatus | 'loading'>('loading');

  // Inlined rather than delegating to `refresh` below — synchronizing with
  // an external system (the OS permission) is exactly what this effect is
  // for, but calling a setState-carrying function *by reference* from the
  // effect body reads as an uncontrolled cascading render to the linter;
  // an inline `.then()` (mirroring `GroupGateScreen`'s own mount-check
  // effect) makes the one-time nature of this particular check explicit.
  useEffect(() => {
    let cancelled = false;
    void getPushPermissionStatus().then((value) => {
      if (!cancelled) setStatus(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    setStatus(await getPushPermissionStatus());
  }, []);

  const request = useCallback(async () => {
    const next = await requestPushPermission();
    setStatus(next);
    return next;
  }, []);

  return { status, refresh, request };
}
