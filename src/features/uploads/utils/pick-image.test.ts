import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { pickImage } from './pick-image';

function permissionResponse(status: 'granted' | 'denied'): ImagePicker.MediaLibraryPermissionResponse {
  return { status, granted: status === 'granted', expires: 'never', canAskAgain: true } as ImagePicker.MediaLibraryPermissionResponse;
}

describe('pickImage — "utilizar picker apropriado Expo"', () => {
  beforeEach(() => {
    jest.spyOn(ImagePicker, 'requestMediaLibraryPermissionsAsync').mockResolvedValue(permissionResponse('granted'));
  });

  it('requests media library permission before launching the picker', async () => {
    const permissionSpy = jest.spyOn(ImagePicker, 'requestMediaLibraryPermissionsAsync');
    jest.spyOn(ImagePicker, 'launchImageLibraryAsync').mockResolvedValue({ canceled: true, assets: null });

    await pickImage();

    expect(permissionSpy).toHaveBeenCalled();
  });

  it('returns permission-denied without launching the picker when access is refused', async () => {
    jest.spyOn(ImagePicker, 'requestMediaLibraryPermissionsAsync').mockResolvedValue(permissionResponse('denied'));
    const launchSpy = jest.spyOn(ImagePicker, 'launchImageLibraryAsync');

    const result = await pickImage();

    expect(result).toEqual({ status: 'permission-denied' });
    expect(launchSpy).not.toHaveBeenCalled();
  });

  it('returns canceled when the user dismisses the picker', async () => {
    jest.spyOn(ImagePicker, 'launchImageLibraryAsync').mockResolvedValue({ canceled: true, assets: null });

    expect(await pickImage()).toEqual({ status: 'canceled' });
  });

  it('opens the picker restricted to images, square-cropped', async () => {
    const launchSpy = jest.spyOn(ImagePicker, 'launchImageLibraryAsync').mockResolvedValue({ canceled: true, assets: null });

    await pickImage();

    expect(launchSpy).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1] }));
  });

  it('resolves the picked image\'s mimeType and reads size from the filesystem, not ImagePicker\'s own fileSize', async () => {
    jest.spyOn(ImagePicker, 'launchImageLibraryAsync').mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cache/photo.jpg', width: 100, height: 100, mimeType: 'image/jpeg', fileSize: 999 }],
    });
    jest.mocked(File).mockImplementation((uri) => ({ uri, size: 2048 }) as unknown as File);

    const result = await pickImage();

    expect(result).toEqual({ status: 'picked', image: { uri: 'file:///cache/photo.jpg', mimeType: 'image/jpeg', size: 2048 } });
  });

  it('falls back to guessing the MIME type from the extension when ImagePicker cannot determine it', async () => {
    jest.spyOn(ImagePicker, 'launchImageLibraryAsync').mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cache/photo.png', width: 100, height: 100, mimeType: undefined, fileSize: undefined }],
    });
    jest.mocked(File).mockImplementation((uri) => ({ uri, size: 512 }) as unknown as File);

    const result = await pickImage();

    expect(result).toEqual({ status: 'picked', image: { uri: 'file:///cache/photo.png', mimeType: 'image/png', size: 512 } });
  });
});
