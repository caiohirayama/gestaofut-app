import { Image, StyleSheet, View } from 'react-native';
import { colors, radius } from '@/theme';
import { Text } from './Text';

export interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const dimensionStyle = { width: size, height: size, borderRadius: radius.full };

  if (uri) {
    return (
      <Image source={{ uri }} style={[styles.image, dimensionStyle]} accessibilityLabel={name} />
    );
  }

  return (
    <View style={[styles.fallback, dimensionStyle]} accessibilityLabel={name}>
      <Text variant="label" color="onPrimary" style={{ fontSize: size * 0.4 }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surfaceAlt,
  },
  fallback: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
