import { File } from 'expo-file-system';

export interface UploadProgressEvent {
  bytesSent: number;
  totalBytes: number;
}

/**
 * PUTs the file directly to R2's presigned URL — never through
 * gestaofut-api, and never with our own `Authorization` header (the
 * signature in the URL is the only credential involved; R2 credentials
 * themselves never exist on this device — see docs/uploads.md). Uses
 * `expo-file-system`'s binary upload task (the default `uploadType`) so the
 * request body is the raw file bytes, matching what a presigned S3/R2 PUT
 * expects — not a multipart form.
 */
export async function uploadFileToPresignedUrl(
  uploadUrl: string,
  fileUri: string,
  contentType: string,
  onProgress?: (event: UploadProgressEvent) => void,
): Promise<void> {
  const file = new File(fileUri);
  const task = file.createUploadTask(uploadUrl, {
    httpMethod: 'PUT',
    headers: { 'Content-Type': contentType },
    onProgress,
  });

  const result = await task.uploadAsync();
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed with status ${result.status}`);
  }
}
