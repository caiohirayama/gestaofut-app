import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic config layered on top of app.json (Expo merges the two — see
 * https://docs.expo.dev/workflow/configuration/#dynamic-configuration).
 * app.json stays the single source of truth for everything that never
 * changes per build profile (name/plugins/icons/scheme); this file's only
 * job is to vary the **bundle identifier / package name** by `APP_VARIANT`
 * (set per profile in eas.json — see docs/release.md, "EAS"), so a
 * development or preview build can be installed on a device *alongside*
 * a real production install instead of overwriting it.
 */
type AppVariant = 'development' | 'preview' | 'production';

function resolveVariant(): AppVariant {
  const variant = process.env.APP_VARIANT;
  return variant === 'development' || variant === 'preview' ? variant : 'production';
}

const IDENTIFIER_SUFFIX: Record<AppVariant, string> = {
  development: '.dev',
  preview: '.preview',
  production: '',
};

const NAME_SUFFIX: Record<AppVariant, string> = {
  development: ' (Dev)',
  preview: ' (Preview)',
  production: '',
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant();
  const identifierSuffix = IDENTIFIER_SUFFIX[variant];

  return {
    ...(config as ExpoConfig),
    name: `${config.name}${NAME_SUFFIX[variant]}`,
    ios: {
      ...config.ios,
      bundleIdentifier: `${config.ios?.bundleIdentifier}${identifierSuffix}`,
    },
    android: {
      ...config.android,
      package: `${config.android?.package}${identifierSuffix}`,
    },
  };
};
