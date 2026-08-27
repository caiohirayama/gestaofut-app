import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { colors, fontFamily, fontSize, fontWeight, lineHeight, type ColorToken } from '@/theme';

export type TextVariant = 'title' | 'subtitle' | 'body' | 'bodyStrong' | 'caption' | 'label';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: ColorToken;
}

const variantStyles = StyleSheet.create({
  title: {
    fontSize: fontSize.xxl,
    lineHeight: lineHeight.xxl,
    fontWeight: fontWeight.bold,
  },
  subtitle: {
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    fontWeight: fontWeight.semibold,
  },
  body: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    fontWeight: fontWeight.regular,
  },
  bodyStrong: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    fontWeight: fontWeight.semibold,
  },
  caption: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    fontWeight: fontWeight.regular,
  },
  label: {
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    fontWeight: fontWeight.medium,
  },
});

/** Base text primitive: every screen should render copy through this, never a bare RN `Text`. */
export function Text({ variant = 'body', color = 'textPrimary', style, ...rest }: TextProps) {
  return (
    <RNText
      style={[{ fontFamily, color: colors[color] }, variantStyles[variant], style]}
      {...rest}
    />
  );
}
