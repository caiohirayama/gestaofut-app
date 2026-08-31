import { type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui';
import { spacing } from '@/theme';

export interface InfoRowProps {
  label: string;
  value: ReactNode;
}

/** Label/value row shared by detail screens (player, match, ...). */
export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
      }}
    >
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      {typeof value === 'string' ? <Text variant="body">{value}</Text> : value}
    </View>
  );
}
