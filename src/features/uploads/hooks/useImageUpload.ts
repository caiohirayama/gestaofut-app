import { useCallback, useRef, useState } from 'react';
import { getApiErrorMessage } from '@/services/api/error-message';
import { pickImage, type PickedImage } from '../utils/pick-image';
import { validatePickedImage } from '../utils/image-upload-policy';
import { uploadFileToPresignedUrl } from '../utils/upload-to-presigned-url';

export type ImageUploadStage = 'idle' | 'requesting' | 'uploading' | 'confirming' | 'success' | 'error';

export interface RequestUploadUrlResult {
  uploadUrl: string;
  key: string;
}

export interface UseImageUploadOptions<TResult> {
  /** Step 1 of the flow (see docs/uploads.md): ask gestaofut-api for authorization + a presigned URL. */
  requestUploadUrl: (params: { contentType: string; contentLength: number }) => Promise<RequestUploadUrlResult>;
  /** Step 3: tell gestaofut-api the upload finished, per its contract — returns the updated resource (user or group). */
  confirmUpload: (params: { key: string }) => Promise<TResult>;
}

export interface UseImageUploadResult<TResult> {
  stage: ImageUploadStage;
  /** 0 to 1 — only meaningful during `'uploading'`. */
  progress: number;
  errorMessage: string | null;
  /** The freshly picked image's local URI, shown immediately as a preview — even before the upload finishes. */
  previewUri: string | null;
  isBusy: boolean;
  result: TResult | undefined;
  /**
   * Whether `retry()` will re-run the upload for the already-picked image
   * (`true`) or re-open the picker (`false` — the last failure was a denied
   * permission or a validation error, so there is no valid image to retry).
   * The UI never needs to branch on this itself: `retry()` already does.
   */
  canRetrySameImage: boolean;
  /** Opens the picker, then runs the full flow if an image was picked. */
  pickAndUpload: () => Promise<void>;
  /** Re-runs the upload for the last picked image, or re-opens the picker if there isn't one to retry. */
  retry: () => void;
}

/**
 * Orchestrates the four-step flow gestaofut-api's presigned uploads require
 * (see docs/uploads.md): (1) request authorization/URL, (2) upload directly
 * to storage, (3) confirm completion, (4) the caller updates its own cache
 * from the returned resource. Generic over `TResult` so both the avatar
 * (`useAvatarUpload`) and the group logo (`useGroupLogoUpload`) reuse this
 * exact state machine — only the two API calls differ between them.
 */
export function useImageUpload<TResult>(options: UseImageUploadOptions<TResult>): UseImageUploadResult<TResult> {
  const [stage, setStage] = useState<ImageUploadStage>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [result, setResult] = useState<TResult | undefined>(undefined);
  const [canRetrySameImage, setCanRetrySameImage] = useState(false);
  const pickedImageRef = useRef<PickedImage | null>(null);

  const runUpload = useCallback(
    async (image: PickedImage) => {
      setErrorMessage(null);
      // Tracked locally (not via the `stage` state) so the catch block below
      // knows which step actually failed within *this* call — `stage` state
      // read from the enclosing closure would be stale mid-execution.
      let failingStep: 'requesting' | 'uploading' | 'confirming' = 'requesting';
      try {
        setStage('requesting');
        const { uploadUrl, key } = await options.requestUploadUrl({ contentType: image.mimeType, contentLength: image.size });

        failingStep = 'uploading';
        setStage('uploading');
        setProgress(0);
        await uploadFileToPresignedUrl(uploadUrl, image.uri, image.mimeType, (event) => {
          if (event.totalBytes > 0) {
            setProgress(event.bytesSent / event.totalBytes);
          }
        });

        failingStep = 'confirming';
        setStage('confirming');
        const confirmed = await options.confirmUpload({ key });

        setResult(confirmed);
        setStage('success');
      } catch (error) {
        setErrorMessage(
          failingStep === 'uploading' ? 'Não foi possível enviar a imagem. Verifique sua conexão e tente novamente.' : getApiErrorMessage(error),
        );
        setStage('error');
      }
    },
    [options],
  );

  const pickAndUpload = useCallback(async () => {
    const picked = await pickImage();
    if (picked.status === 'canceled') {
      return;
    }
    if (picked.status === 'permission-denied') {
      pickedImageRef.current = null;
      setCanRetrySameImage(false);
      setErrorMessage('Permita o acesso às fotos para escolher uma imagem.');
      setStage('error');
      return;
    }

    const validationError = validatePickedImage(picked.image);
    if (validationError) {
      pickedImageRef.current = null;
      setCanRetrySameImage(false);
      setErrorMessage(validationError);
      setStage('error');
      return;
    }

    pickedImageRef.current = picked.image;
    setCanRetrySameImage(true);
    setPreviewUri(picked.image.uri);
    await runUpload(picked.image);
  }, [runUpload]);

  const retry = useCallback(() => {
    if (pickedImageRef.current) {
      void runUpload(pickedImageRef.current);
    } else {
      void pickAndUpload();
    }
  }, [runUpload, pickAndUpload]);

  const isBusy = stage === 'requesting' || stage === 'uploading' || stage === 'confirming';

  return { stage, progress, errorMessage, previewUri, isBusy, result, canRetrySameImage, pickAndUpload, retry };
}
