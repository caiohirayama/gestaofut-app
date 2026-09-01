import { File } from 'expo-file-system';
import { uploadFileToPresignedUrl } from './upload-to-presigned-url';

describe('uploadFileToPresignedUrl — REALIZAR UPLOAD (direto para o R2, nunca pela API)', () => {
  it('PUTs the file to the given URL with the given Content-Type, using a binary upload task', async () => {
    const uploadAsync = jest.fn().mockResolvedValue({ status: 200, body: '', headers: {} });
    const createUploadTask = jest.fn().mockReturnValue({ uploadAsync });
    jest.mocked(File).mockImplementation(() => ({ createUploadTask }) as unknown as File);

    await uploadFileToPresignedUrl('https://r2.example.com/signed', 'file:///cache/photo.jpg', 'image/jpeg');

    expect(createUploadTask).toHaveBeenCalledWith(
      'https://r2.example.com/signed',
      expect.objectContaining({ httpMethod: 'PUT', headers: { 'Content-Type': 'image/jpeg' } }),
    );
    expect(uploadAsync).toHaveBeenCalled();
  });

  it('forwards progress events to the given callback', async () => {
    let capturedOnProgress: ((event: { bytesSent: number; totalBytes: number }) => void) | undefined;
    const createUploadTask = jest.fn((_url, options) => {
      capturedOnProgress = options.onProgress;
      return { uploadAsync: jest.fn().mockResolvedValue({ status: 200, body: '', headers: {} }) };
    });
    jest.mocked(File).mockImplementation(() => ({ createUploadTask }) as unknown as File);

    const onProgress = jest.fn();
    await uploadFileToPresignedUrl('https://r2.example.com/signed', 'file:///cache/photo.jpg', 'image/jpeg', onProgress);
    capturedOnProgress?.({ bytesSent: 50, totalBytes: 100 });

    expect(onProgress).toHaveBeenCalledWith({ bytesSent: 50, totalBytes: 100 });
  });

  it('throws when R2 responds with a non-2xx status', async () => {
    const uploadAsync = jest.fn().mockResolvedValue({ status: 403, body: 'Forbidden', headers: {} });
    jest.mocked(File).mockImplementation(() => ({ createUploadTask: jest.fn().mockReturnValue({ uploadAsync }) }) as unknown as File);

    await expect(uploadFileToPresignedUrl('https://r2.example.com/signed', 'file:///cache/photo.jpg', 'image/jpeg')).rejects.toThrow('403');
  });
});
