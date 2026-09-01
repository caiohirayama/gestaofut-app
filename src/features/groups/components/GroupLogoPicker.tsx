import { ImageUploadPicker } from '@/features/uploads/components/ImageUploadPicker';
import { useGroupLogoUpload } from '../hooks/useGroupLogoUpload';

export interface GroupLogoPickerProps {
  groupId: string;
  name: string;
  logoUrl: string | null;
  size?: number;
}

/**
 * "Logo do grupo quando autorizado": only rendered by the caller when
 * `group.update` is granted (`GroupSettingsScreen`) — a UX convenience, the
 * real boundary is the route's own `requireGroupAccess('group.update')` on
 * gestaofut-api. See docs/uploads.md.
 */
export function GroupLogoPicker({ groupId, name, logoUrl, size }: GroupLogoPickerProps) {
  const upload = useGroupLogoUpload(groupId);

  return <ImageUploadPicker upload={upload} name={name} currentUrl={logoUrl} size={size} accessibilityLabel="Alterar logo do grupo" />;
}
