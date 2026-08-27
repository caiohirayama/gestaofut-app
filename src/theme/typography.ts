import { Platform } from 'react-native';

/**
 * Uses the OS system font (San Francisco / Roboto) instead of bundling a
 * custom typeface. It already reads as clean and professional, and avoids
 * the extra asset loading / FOUC handling a custom font would need at this
 * stage — see docs/design-system.md.
 */
export const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const lineHeight = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 26,
  xl: 28,
  xxl: 32,
  xxxl: 38,
} as const;
