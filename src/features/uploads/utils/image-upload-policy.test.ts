import { MAX_IMAGE_UPLOAD_SIZE_BYTES, validatePickedImage } from './image-upload-policy';

describe('validatePickedImage — VALIDAR NO APP: tamanho; tipo (a API é a validação definitiva)', () => {
  it('accepts a valid image within the size limit', () => {
    expect(validatePickedImage({ mimeType: 'image/jpeg', size: 1024 })).toBeNull();
    expect(validatePickedImage({ mimeType: 'image/png', size: 1024 })).toBeNull();
    expect(validatePickedImage({ mimeType: 'image/webp', size: 1024 })).toBeNull();
  });

  it('rejects a disallowed MIME type', () => {
    expect(validatePickedImage({ mimeType: 'image/svg+xml', size: 1024 })).toMatch(/formato/i);
    expect(validatePickedImage({ mimeType: 'application/pdf', size: 1024 })).toMatch(/formato/i);
    expect(validatePickedImage({ mimeType: '', size: 1024 })).toMatch(/formato/i);
  });

  it('rejects a zero or negative size', () => {
    expect(validatePickedImage({ mimeType: 'image/jpeg', size: 0 })).toMatch(/não foi possível ler/i);
    expect(validatePickedImage({ mimeType: 'image/jpeg', size: -1 })).toMatch(/não foi possível ler/i);
  });

  it('rejects a size over the limit, accepts exactly the limit', () => {
    expect(validatePickedImage({ mimeType: 'image/jpeg', size: MAX_IMAGE_UPLOAD_SIZE_BYTES + 1 })).toMatch(/5mb/i);
    expect(validatePickedImage({ mimeType: 'image/jpeg', size: MAX_IMAGE_UPLOAD_SIZE_BYTES })).toBeNull();
  });
});
