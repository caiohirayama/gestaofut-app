import { fireEvent, render, screen } from '@testing-library/react-native';
import type { UseImageUploadResult } from '../hooks/useImageUpload';
import { ImageUploadPicker } from './ImageUploadPicker';

function baseUpload(overrides: Partial<UseImageUploadResult<unknown>> = {}): UseImageUploadResult<unknown> {
  return {
    stage: 'idle',
    progress: 0,
    errorMessage: null,
    previewUri: null,
    isBusy: false,
    result: undefined,
    canRetrySameImage: false,
    pickAndUpload: jest.fn(),
    retry: jest.fn(),
    ...overrides,
  };
}

describe('ImageUploadPicker — UX: progresso; erro; retry; preview', () => {
  it('opens the picker when tapped', () => {
    const upload = baseUpload();
    render(<ImageUploadPicker upload={upload} name="Ada" currentUrl={null} accessibilityLabel="Alterar foto de perfil" />);

    fireEvent.press(screen.getByRole('button', { name: 'Alterar foto de perfil' }));

    expect(upload.pickAndUpload).toHaveBeenCalled();
  });

  it('disables the picker while busy (double-submit guard)', () => {
    const upload = baseUpload({ isBusy: true, stage: 'uploading' });
    render(<ImageUploadPicker upload={upload} name="Ada" currentUrl={null} accessibilityLabel="Alterar foto de perfil" />);

    expect(screen.getByRole('button', { name: 'Alterar foto de perfil' }).props.accessibilityState.disabled).toBe(true);
  });

  it('PREVIEW: shows the freshly picked image immediately, before the upload finishes', () => {
    const upload = baseUpload({ isBusy: true, stage: 'uploading', previewUri: 'file:///cache/new.jpg' });
    render(<ImageUploadPicker upload={upload} name="Ada" currentUrl="https://cdn.example.com/old.jpg" accessibilityLabel="Alterar foto de perfil" />);

    expect(screen.getByLabelText('Ada').props.source).toEqual({ uri: 'file:///cache/new.jpg' });
  });

  it('falls back to the current URL when there is no preview yet', () => {
    const upload = baseUpload();
    render(<ImageUploadPicker upload={upload} name="Ada" currentUrl="https://cdn.example.com/old.jpg" accessibilityLabel="Alterar foto de perfil" />);

    expect(screen.getByLabelText('Ada').props.source).toEqual({ uri: 'https://cdn.example.com/old.jpg' });
  });

  it('PROGRESSO: shows a progress bar while uploading', () => {
    const upload = baseUpload({ isBusy: true, stage: 'uploading', progress: 0.5 });
    render(<ImageUploadPicker upload={upload} name="Ada" currentUrl={null} accessibilityLabel="Alterar foto de perfil" />);

    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(50);
  });

  it('hides the progress bar when idle', () => {
    const upload = baseUpload();
    render(<ImageUploadPicker upload={upload} name="Ada" currentUrl={null} accessibilityLabel="Alterar foto de perfil" />);

    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('ERRO/RETRY: shows the error message and a retry action', () => {
    const upload = baseUpload({ stage: 'error', errorMessage: 'A imagem deve ter no máximo 5MB.' });
    render(<ImageUploadPicker upload={upload} name="Ada" currentUrl={null} accessibilityLabel="Alterar foto de perfil" />);

    expect(screen.getByText('A imagem deve ter no máximo 5MB.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(upload.retry).toHaveBeenCalled();
  });

  it('shows no error UI when there is nothing to report', () => {
    const upload = baseUpload();
    render(<ImageUploadPicker upload={upload} name="Ada" currentUrl={null} accessibilityLabel="Alterar foto de perfil" />);

    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).toBeNull();
  });
});
