export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

/** Minimum comfortable touch target per iOS HIG / Android Material guidance. */
export const touchTarget = {
  min: 44,
};
