import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';

export interface PickedImage {
  uri: string;
  mimeType: string;
  /** Read from the filesystem via `expo-file-system`, not `ImagePicker`'s own (sometimes absent) `fileSize` — see `pickImage`. */
  size: number;
}

export type PickImageResult =
  | { status: 'picked'; image: PickedImage }
  | { status: 'canceled' }
  | { status: 'permission-denied' };

const EXTENSION_MIME_FALLBACK: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** Best-effort fallback for the rare case `ImagePickerAsset.mimeType` comes back empty (see its own docs). */
function guessMimeTypeFromUri(uri: string): string | undefined {
  const extension = uri.split('.').pop()?.toLowerCase();
  return extension ? EXTENSION_MIME_FALLBACK[extension] : undefined;
}

/**
 * Opens Expo's image picker (gallery only — no camera capture in this first
 * version) cropped to a square, and resolves the picked image's real
 * `mimeType`/`size`. `size` always comes from `expo-file-system`'s `File`
 * (backed by the actual file on disk), never `ImagePickerAsset.fileSize`
 * alone, which the docs call out as sometimes unavailable — see
 * docs/uploads.md.
 */
export async function pickImage(): Promise<PickImageResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.status !== 'granted') {
    return { status: 'permission-denied' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  const asset = result.canceled ? null : result.assets[0];
  if (!asset) {
    return { status: 'canceled' };
  }

  const file = new File(asset.uri);
  return {
    status: 'picked',
    image: { uri: asset.uri, mimeType: asset.mimeType ?? guessMimeTypeFromUri(asset.uri) ?? '', size: file.size },
  };
}
