import { router } from 'expo-router';
import { View } from 'react-native';
import { Button, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { setSecureItem, SECURE_KEYS } from '@/services/secure-storage';
import { useGroupStore } from '@/store/group-store';
import { spacing } from '@/theme';
import { GroupPicker } from '../components/GroupPicker';
import { useMyGroups } from '../hooks/useMyGroups';

/** Always shows every group the caller can access, regardless of count — unlike GroupGateScreen, this is an explicit user action. */
export function SwitchGroupScreen() {
  const { groups, isPending, isError, refetch } = useMyGroups();
  const setActiveGroup = useGroupStore((state) => state.setActiveGroup);

  return (
    <Screen>
      <View style={{ marginTop: spacing.xxl, marginBottom: spacing.lg }}>
        <Text variant="title">Trocar grupo</Text>
      </View>

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <GroupPicker
          groups={groups}
          onSelect={async (group) => {
            setActiveGroup(group.id, group.organizationId);
            await setSecureItem(SECURE_KEYS.activeGroupId, group.id);
            router.replace('/(app)');
          }}
        />
      )}

      <Button label="Criar novo grupo" variant="secondary" onPress={() => router.push('/(group-setup)/create')} />
    </Screen>
  );
}
