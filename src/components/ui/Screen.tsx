import { type PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

export interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  edges?: Edge[];
  padded?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

/**
 * Root container every screen should render through: safe-area aware,
 * consistent horizontal padding, single background color. Keeps that
 * boilerplate out of every feature screen.
 */
export function Screen({
  children,
  scroll = false,
  edges = ['top', 'bottom', 'left', 'right'],
  padded = true,
  style,
  contentContainerStyle,
}: ScreenProps) {
  const padding = padded ? styles.padded : undefined;

  if (scroll) {
    return (
      <SafeAreaView style={[styles.safeArea, style]} edges={edges}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[padding, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, style]} edges={edges}>
      <View style={[styles.flex, padding, contentContainerStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
});
