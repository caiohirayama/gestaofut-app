import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as pickImageModule from '../utils/pick-image';
import * as uploadModule from '../utils/upload-to-presigned-url';
import { useImageUpload } from './useImageUpload';

function mockPicked(overrides: Partial<pickImageModule.PickedImage> = {}) {
  return { uri: 'file:///cache/photo.jpg', mimeType: 'image/jpeg', size: 1024, ...overrides };
}

describe('useImageUpload — FLUXO: 1) autorização; 2) upload; 3) confirmação; 4) atualizar recurso', () => {
  it('runs all four steps in order and exposes the confirmed result', async () => {
    jest.spyOn(pickImageModule, 'pickImage').mockResolvedValue({ status: 'picked', image: mockPicked() });
    const uploadSpy = jest.spyOn(uploadModule, 'uploadFileToPresignedUrl').mockResolvedValue(undefined);
    const requestUploadUrl = jest.fn().mockResolvedValue({ uploadUrl: 'https://r2.example.com/signed', key: 'users/u1/avatar/x.jpg' });
    const confirmUpload = jest.fn().mockResolvedValue({ id: 'user-1', avatarUrl: 'https://cdn.example.com/x.jpg' });

    const { result } = renderHook(() => useImageUpload({ requestUploadUrl, confirmUpload }));

    await act(async () => {
      await result.current.pickAndUpload();
    });

    expect(requestUploadUrl).toHaveBeenCalledWith({ contentType: 'image/jpeg', contentLength: 1024 });
    expect(uploadSpy).toHaveBeenCalledWith('https://r2.example.com/signed', 'file:///cache/photo.jpg', 'image/jpeg', expect.any(Function));
    expect(confirmUpload).toHaveBeenCalledWith({ key: 'users/u1/avatar/x.jpg' });
    expect(requestUploadUrl.mock.invocationCallOrder[0]).toBeLessThan(uploadSpy.mock.invocationCallOrder[0]!);
    expect(uploadSpy.mock.invocationCallOrder[0]).toBeLessThan(confirmUpload.mock.invocationCallOrder[0]!);
    expect(result.current.stage).toBe('success');
    expect(result.current.result).toEqual({ id: 'user-1', avatarUrl: 'https://cdn.example.com/x.jpg' });
  });

  it('shows the picked image as a preview immediately, before the upload finishes', async () => {
    jest.spyOn(pickImageModule, 'pickImage').mockResolvedValue({ status: 'picked', image: mockPicked({ uri: 'file:///cache/new.jpg' }) });
    let resolveUpload!: () => void;
    jest.spyOn(uploadModule, 'uploadFileToPresignedUrl').mockImplementation(() => new Promise((resolve) => (resolveUpload = resolve)));
    const requestUploadUrl = jest.fn().mockResolvedValue({ uploadUrl: 'https://r2.example.com/signed', key: 'k' });
    const confirmUpload = jest.fn().mockResolvedValue({});

    const { result } = renderHook(() => useImageUpload({ requestUploadUrl, confirmUpload }));

    let uploadPromise!: Promise<void>;
    act(() => {
      uploadPromise = result.current.pickAndUpload();
    });

    await waitFor(() => expect(result.current.previewUri).toBe('file:///cache/new.jpg'));
    expect(result.current.stage).toBe('uploading');

    resolveUpload();
    await act(async () => {
      await uploadPromise;
    });
  });

  it('reports upload progress as a 0..1 fraction', async () => {
    jest.spyOn(pickImageModule, 'pickImage').mockResolvedValue({ status: 'picked', image: mockPicked() });
    jest.spyOn(uploadModule, 'uploadFileToPresignedUrl').mockImplementation(async (_url, _uri, _type, onProgress) => {
      onProgress?.({ bytesSent: 50, totalBytes: 200 });
    });
    const requestUploadUrl = jest.fn().mockResolvedValue({ uploadUrl: 'https://r2.example.com/signed', key: 'k' });
    const confirmUpload = jest.fn().mockResolvedValue({});

    const { result } = renderHook(() => useImageUpload({ requestUploadUrl, confirmUpload }));
    await act(async () => {
      await result.current.pickAndUpload();
    });

    expect(result.current.progress).toBe(0.25);
  });

  it('does nothing when the picker is cancelled', async () => {
    jest.spyOn(pickImageModule, 'pickImage').mockResolvedValue({ status: 'canceled' });
    const requestUploadUrl = jest.fn();
    const confirmUpload = jest.fn();

    const { result } = renderHook(() => useImageUpload({ requestUploadUrl, confirmUpload }));
    await act(async () => {
      await result.current.pickAndUpload();
    });

    expect(result.current.stage).toBe('idle');
    expect(requestUploadUrl).not.toHaveBeenCalled();
  });

  it('shows an error and never calls the API when permission is denied — retry re-opens the picker', async () => {
    const pickSpy = jest.spyOn(pickImageModule, 'pickImage').mockResolvedValueOnce({ status: 'permission-denied' });
    const requestUploadUrl = jest.fn();
    const confirmUpload = jest.fn();

    const { result } = renderHook(() => useImageUpload({ requestUploadUrl, confirmUpload }));
    await act(async () => {
      await result.current.pickAndUpload();
    });

    expect(result.current.stage).toBe('error');
    expect(result.current.errorMessage).toMatch(/permita o acesso/i);
    expect(result.current.canRetrySameImage).toBe(false);
    expect(requestUploadUrl).not.toHaveBeenCalled();

    pickSpy.mockResolvedValueOnce({ status: 'canceled' });
    act(() => {
      result.current.retry();
    });
    await waitFor(() => expect(pickSpy).toHaveBeenCalledTimes(2));
  });

  it('VALIDAR NO APP: rejects an oversized/invalid image client-side before calling the API', async () => {
    jest.spyOn(pickImageModule, 'pickImage').mockResolvedValue({ status: 'picked', image: mockPicked({ mimeType: 'image/svg+xml' }) });
    const requestUploadUrl = jest.fn();
    const confirmUpload = jest.fn();

    const { result } = renderHook(() => useImageUpload({ requestUploadUrl, confirmUpload }));
    await act(async () => {
      await result.current.pickAndUpload();
    });

    expect(result.current.stage).toBe('error');
    expect(result.current.errorMessage).toMatch(/formato/i);
    expect(result.current.canRetrySameImage).toBe(false);
    expect(requestUploadUrl).not.toHaveBeenCalled();
  });

  describe('ERRO/RETRY', () => {
    it('exposes a network-flavored message and allows retrying the same image when the upload step fails', async () => {
      jest.spyOn(pickImageModule, 'pickImage').mockResolvedValue({ status: 'picked', image: mockPicked() });
      const uploadSpy = jest
        .spyOn(uploadModule, 'uploadFileToPresignedUrl')
        .mockRejectedValueOnce(new Error('network blip'))
        .mockResolvedValueOnce(undefined);
      const requestUploadUrl = jest.fn().mockResolvedValue({ uploadUrl: 'https://r2.example.com/signed', key: 'k' });
      const confirmUpload = jest.fn().mockResolvedValue({ ok: true });

      const { result } = renderHook(() => useImageUpload({ requestUploadUrl, confirmUpload }));
      await act(async () => {
        await result.current.pickAndUpload();
      });

      expect(result.current.stage).toBe('error');
      expect(result.current.errorMessage).toMatch(/não foi possível enviar/i);
      expect(result.current.canRetrySameImage).toBe(true);
      expect(confirmUpload).not.toHaveBeenCalled();

      act(() => {
        result.current.retry();
      });

      await waitFor(() => expect(result.current.stage).toBe('success'));
      expect(uploadSpy).toHaveBeenCalledTimes(2);
      expect(requestUploadUrl).toHaveBeenCalledTimes(2); // retry re-requests a fresh presigned URL too
      expect(confirmUpload).toHaveBeenCalledWith({ key: 'k' });
    });

    it('surfaces an API error message when confirmUpload fails (e.g. tenant isolation 403)', async () => {
      jest.spyOn(pickImageModule, 'pickImage').mockResolvedValue({ status: 'picked', image: mockPicked() });
      jest.spyOn(uploadModule, 'uploadFileToPresignedUrl').mockResolvedValue(undefined);
      const requestUploadUrl = jest.fn().mockResolvedValue({ uploadUrl: 'https://r2.example.com/signed', key: 'k' });
      const confirmUpload = jest.fn().mockRejectedValue(new Error('confirm failed'));

      const { result } = renderHook(() => useImageUpload({ requestUploadUrl, confirmUpload }));
      await act(async () => {
        await result.current.pickAndUpload();
      });

      expect(result.current.stage).toBe('error');
      expect(result.current.canRetrySameImage).toBe(true);
    });
  });
});
