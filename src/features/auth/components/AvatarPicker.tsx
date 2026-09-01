import { ImageUploadPicker } from '@/features/uploads/components/ImageUploadPicker';
import { useAvatarUpload } from '../hooks/useAvatarUpload';

export interface AvatarPickerProps {
  name: string;
  avatarUrl: string | null;
  size?: number;
}

/** "avatar" from docs/uploads.md — tap to pick, upload, and persist a new profile photo. */
export function AvatarPicker({ name, avatarUrl, size }: AvatarPickerProps) {
  const upload = useAvatarUpload();

  return <ImageUploadPicker upload={upload} name={name} currentUrl={avatarUrl} size={size} accessibilityLabel="Alterar foto de perfil" />;
}
