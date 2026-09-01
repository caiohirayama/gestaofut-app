/**
 * Client-side mirror of gestaofut-api's upload policy
 * (`shared/storage/image-upload-policy.ts`) — a fast-fail UX nicety only.
 * The API is the definitive validator: it re-checks the file it actually
 * receives from R2 (`headObject`), independent of anything declared here or
 * by the picker. See docs/uploads.md.
 */
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const MAX_IMAGE_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;

function isAllowedImageMimeType(value: string): value is AllowedImageMimeType {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

/** Returns a user-facing message when the picked image fails validation, or `null` when it's fine to upload. */
export function validatePickedImage(image: { mimeType: string; size: number }): string | null {
  if (!isAllowedImageMimeType(image.mimeType)) {
    return 'Formato de imagem não suportado. Escolha um arquivo JPEG, PNG ou WEBP.';
  }
  if (image.size <= 0) {
    return 'Não foi possível ler o arquivo selecionado. Tente escolher outra imagem.';
  }
  if (image.size > MAX_IMAGE_UPLOAD_SIZE_BYTES) {
    return 'A imagem deve ter no máximo 5MB.';
  }
  return null;
}
