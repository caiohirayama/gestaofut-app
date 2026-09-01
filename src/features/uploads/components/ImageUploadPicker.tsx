import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { Avatar, ProgressBar, Text } from '@/components/ui';
import { colors, spacing } from '@/theme';
import type { UseImageUploadResult } from '../hooks/useImageUpload';

export interface ImageUploadPickerProps {
  upload: UseImageUploadResult<unknown>;
  /** Used both for the fallback initials and the accessibility label. */
  name: string;
  currentUrl: string | null;
  size?: number;
  accessibilityLabel: string;
}

/**
 * Shared tap-to-pick UI for both uses from docs/uploads.md (avatar, group
 * logo) — `AvatarPicker`/`GroupLogoPicker` are thin wrappers that each call
 * their own `useImageUpload`-based hook and hand the result here. Preview
 * (the freshly picked image, shown immediately via `upload.previewUri`),
 * progress, error, and retry are all driven by the same `UseImageUploadResult`
 * shape, regardless of which resource is being updated.
 */
export function ImageUploadPicker({ upload, name, currentUrl, size = 72, accessibilityLabel }: ImageUploadPickerProps) {
  const displayUri = upload.previewUri ?? currentUrl;

  return (
    <View style={{ alignItems: 'center', gap: spacing.sm }}>
      <Pressable onPress={upload.pickAndUpload} disabled={upload.isBusy} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
        <View>
          <Avatar uri={displayUri} name={name} size={size} />
          <View
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: colors.surface,
            }}
          >
            <Ionicons name="camera" size={12} color={colors.onPrimary} />
          </View>
        </View>
      </Pressable>

      {upload.isBusy ? (
        <View style={{ width: size * 1.5 }}>
          <ProgressBar progress={upload.stage === 'uploading' ? upload.progress : 0} />
        </View>
      ) : null}

      {upload.errorMessage ? (
        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <Text variant="caption" color="danger" accessibilityRole="alert" style={{ textAlign: 'center' }}>
            {upload.errorMessage}
          </Text>
          <Text variant="label" color="primary" onPress={upload.retry} accessibilityRole="button">
            Tentar novamente
          </Text>
        </View>
      ) : null}
    </View>
  );
}
