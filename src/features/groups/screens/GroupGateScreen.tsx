import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ErrorState, LoadingState, Screen } from '@/components/ui';
import { getSecureItem, setSecureItem, SECURE_KEYS } from '@/services/secure-storage';
import { useGroupStore } from '@/store/group-store';
import { GroupPicker } from '../components/GroupPicker';
import { useMyGroups } from '../hooks/useMyGroups';
import { useMyOrganizationRoles } from '../hooks/useMyOrganizationRoles';
import { hasPermission } from '../utils/permissions';
import { EmptyGroupsScreen } from './EmptyGroupsScreen';

/**
 * Decides what to show right after login/app start, once the session is
 * authenticated: which group (if any) the app should be scoped to.
 *
 * - No groups anywhere, but the caller can create one (owns/administers at
 *   least one organization, or has none yet — a brand-new user always can) →
 *   let them create their first group.
 * - No groups and no way to create one (e.g. a plain MEMBER waiting to be
 *   added to a group) → an explanatory empty state.
 * - Exactly one group → select it automatically, no prompt (persisted for
 *   next launch too) — see docs/state-management.md.
 * - More than one, and no still-valid persisted choice → let them pick.
 */
export function GroupGateScreen() {
  const [persistedGroupId, setPersistedGroupId] = useState<string | null>(null);
  const [persistedChecked, setPersistedChecked] = useState(false);

  const { groups, isPending: groupsPending, isError: groupsError, refetch: refetchGroups } = useMyGroups();
  const { organizations, rolesByOrganizationId, isPending: rolesPending, isError: rolesError } =
    useMyOrganizationRoles();
  const activeGroupId = useGroupStore((state) => state.activeGroupId);
  const setActiveGroup = useGroupStore((state) => state.setActiveGroup);

  useEffect(() => {
    let cancelled = false;
    getSecureItem(SECURE_KEYS.activeGroupId)
      .then((value) => {
        if (!cancelled) setPersistedGroupId(value);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPersistedChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isPending = groupsPending || rolesPending || !persistedChecked;
  const isError = groupsError || rolesError;

  const resolvedGroup = useMemo(() => {
    if (isPending) return undefined;
    if (persistedGroupId) {
      const persisted = groups.find((group) => group.id === persistedGroupId);
      if (persisted) return persisted;
    }
    return groups.length === 1 ? groups[0] : undefined;
  }, [isPending, persistedGroupId, groups]);

  const isCommitted = Boolean(resolvedGroup) && activeGroupId === resolvedGroup?.id;

  // Zustand's setter (an external store, not React state) is the "external
  // system" this effect synchronizes — the redirect below only fires once
  // `activeGroupId` reactively reflects it, so this never needs a local
  // "committed" state flag.
  useEffect(() => {
    if (resolvedGroup && activeGroupId !== resolvedGroup.id) {
      setActiveGroup(resolvedGroup.id, resolvedGroup.organizationId);
      void setSecureItem(SECURE_KEYS.activeGroupId, resolvedGroup.id);
    }
  }, [resolvedGroup, activeGroupId, setActiveGroup]);

  if (isPending) {
    return (
      <Screen>
        <LoadingState label="Carregando seus grupos..." />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState onRetry={refetchGroups} />
      </Screen>
    );
  }

  if (resolvedGroup) {
    if (!isCommitted) {
      return (
        <Screen>
          <LoadingState />
        </Screen>
      );
    }
    return <Redirect href="/(app)" />;
  }

  if (groups.length === 0) {
    const canCreate =
      organizations.length === 0 ||
      organizations.some((organization) => hasPermission(rolesByOrganizationId[organization.id], 'group.update'));

    if (canCreate) {
      return <Redirect href="/(group-setup)/create" />;
    }
    return <EmptyGroupsScreen />;
  }

  return (
    <Screen>
      <GroupPicker
        groups={groups}
        onSelect={(group) => {
          setActiveGroup(group.id, group.organizationId);
          void setSecureItem(SECURE_KEYS.activeGroupId, group.id);
          router.replace('/(app)');
        }}
      />
    </Screen>
  );
}
