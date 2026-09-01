import { useState } from 'react';
import { logout as logoutRequest } from '@/services/api/endpoints/auth';
import { revokeCurrentDevicePushSubscription } from '@/features/notifications/hooks/useRegisterPushDevice';
import { deleteSecureItem, getSecureItem, SECURE_KEYS } from '@/services/secure-storage';
import { queryClient } from '@/services/api/query-client';
import { useAuthStore } from '@/store/auth-store';
import { useGroupStore } from '@/store/group-store';

/**
 * Ends the local session unconditionally, even if the API call to revoke
 * the refresh token fails (offline, server error, already-expired token) —
 * the user's intent to sign out of *this device* must always succeed.
 * Clears the TanStack Query cache too, so no cached data from this account
 * is visible if another user signs in on the same device.
 *
 * Also revokes this device's push subscription (while the access token is
 * still valid, before signing out locally) — otherwise a signed-out user
 * would keep receiving push notifications about a group they can no
 * longer open in the app (see docs/security-review.md, "Push").
 */
export function useLogout() {
  const [isPending, setIsPending] = useState(false);

  async function signOut() {
    setIsPending(true);
    try {
      const refreshToken = await getSecureItem(SECURE_KEYS.refreshToken);
      if (refreshToken) {
        await logoutRequest(refreshToken).catch(() => {});
      }
      await revokeCurrentDevicePushSubscription();
    } finally {
      await deleteSecureItem(SECURE_KEYS.refreshToken);
      await deleteSecureItem(SECURE_KEYS.activeGroupId);
      useAuthStore.getState().signOut();
      useGroupStore.getState().clearActiveGroup();
      queryClient.clear();
      setIsPending(false);
    }
  }

  return { signOut, isPending };
}
