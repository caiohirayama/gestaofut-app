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
  /** Darkened from the original #8A93A2 (~3.1:1 on white) to meet WCAG AA's 4.5:1 for normal text — this token is used for real, readable text (timestamps, captions), not just decorative icon tints. See docs/security-review.md, "Accessibility". */
  textTertiary: '#6B7480',
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
