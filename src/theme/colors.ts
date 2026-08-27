/**
 * Restrained, sports-professional palette: one confident accent (pitch
 * green), neutral grays for structure, and minimal semantic colors. No
 * gradients/neon — see docs/design-system.md for the rationale.
 */
export const colors = {
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F2F5',
  border: '#E3E6EB',
  borderStrong: '#C7CCD4',

  textPrimary: '#12161C',
  textSecondary: '#5B6472',
  textTertiary: '#8A93A2',
  textInverse: '#FFFFFF',

  primary: '#0F7A4B',
  primaryPressed: '#0B5C39',
  primarySoft: '#E4F3EC',
  onPrimary: '#FFFFFF',

  success: '#0F7A4B',
  successSoft: '#E4F3EC',
  warning: '#B45309',
  warningSoft: '#FDF1E3',
  danger: '#B3261E',
  dangerSoft: '#FBEAE9',
  neutralSoft: '#EEF0F3',

  overlay: 'rgba(18, 22, 28, 0.45)',
} as const;

export type ColorToken = keyof typeof colors;
