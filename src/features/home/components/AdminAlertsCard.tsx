import { View } from 'react-native';
import { Card, Text } from '@/components/ui';
import type { Dashboard } from '@/services/api/endpoints/dashboard';
import { spacing } from '@/theme';
import { buildAdminAlertLines } from '../utils/build-admin-alert-lines';

export interface AdminAlertsCardProps {
  dashboard: Dashboard;
  currency: string;
}

/**
 * Compact, hierarchized signals — never one card per metric ("não criar
 * dashboard corporativo cheio de pequenos cards"). Renders nothing at all
 * when there's nothing worth flagging, rather than an empty "tudo certo"
 * card competing for attention.
 */
export function AdminAlertsCard({ dashboard, currency }: AdminAlertsCardProps) {
  const lines = buildAdminAlertLines(dashboard, currency);
  if (lines.length === 0) {
    return null;
  }

  return (
    <Card>
      <View style={{ gap: spacing.sm }}>
        {lines.map((line) => (
          <Text key={line.key} variant="body">
            {line.text}
          </Text>
        ))}
      </View>
    </Card>
  );
}
