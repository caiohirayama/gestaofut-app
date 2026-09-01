module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFiles: ['./jest.setup.js'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  clearMocks: true,
  // jest-expo's own default only allow-lists a fixed set of RN/Expo package
  // names for transformation, but pnpm nests every package under
  // node_modules/.pnpm/<pkg>/node_modules/<pkg>/... — that trailing
  // "node_modules/<pkg>" segment still matches the preset's "ignore"
  // pattern for any package not on its list, even though pnpm already
  // resolved the top-level "node_modules/.pnpm" part. `decode-uri-component`
  // (a transitive runtime dependency of expo-router, pinned to a
  // security-patched version via pnpm-workspace.yaml overrides — see
  // docs/security-review.md, "Dependências") ships ESM-only, so it needs to
  // be added explicitly or Jest fails to parse it. Otherwise identical to
  // jest-expo's own default.
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|decode-uri-component))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
};
