import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as matchEndpoints from '@/services/api/endpoints/matches';
import { useGroupStore } from '@/store/group-store';
import { MatchRosterPreviewScreen } from './MatchRosterPreviewScreen';

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ matchId: 'match-1' }),
}));

const GROUP_ID = 'group-1';
const ROSTER_TEXT = 'JOGO PELADA 12/08 19:15\n\nMENSALISTAS\n1 - Sushi 🤑⚽';

function renderScreen() {
  useGroupStore.setState({ activeGroupId: GROUP_ID, activeOrganizationId: 'org-1' });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MatchRosterPreviewScreen />
    </QueryClientProvider>,
  );
}

describe('MatchRosterPreviewScreen', () => {
  it('requests the preview and shows a loading state first', async () => {
    jest.spyOn(matchEndpoints, 'getMatchRosterPreview').mockImplementation(() => new Promise(() => {}));

    renderScreen();

    expect(screen.getByText('Gerando escala...')).toBeTruthy();
  });

  it('shows exactly the text returned by the API once generated — the admin sees exactly what will be shared', async () => {
    jest.spyOn(matchEndpoints, 'getMatchRosterPreview').mockResolvedValue({ text: ROSTER_TEXT });

    renderScreen();

    expect(await screen.findByText(ROSTER_TEXT)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Compartilhar' })).toBeTruthy();
  });

  it('shows nothing beyond the text and the two actions — no admin metadata (matchId, counts, etc.)', async () => {
    jest.spyOn(matchEndpoints, 'getMatchRosterPreview').mockResolvedValue({ text: ROSTER_TEXT });

    renderScreen();
    await screen.findByText(ROSTER_TEXT);

    expect(screen.queryByText('match-1')).toBeNull();
    expect(screen.queryByText(GROUP_ID)).toBeNull();
  });

  it('shows an error state with retry when generation fails', async () => {
    const spy = jest.spyOn(matchEndpoints, 'getMatchRosterPreview').mockRejectedValueOnce(new Error('boom'));

    renderScreen();

    expect(await screen.findByText('Não foi possível gerar a escala')).toBeTruthy();

    spy.mockResolvedValueOnce({ text: ROSTER_TEXT });
    fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText(ROSTER_TEXT)).toBeTruthy();
  });

  it('shows a permission-specific message for a 403 (caller lacks match.manage)', async () => {
    const { ApiError } = jest.requireActual('@/services/api/errors');
    jest.spyOn(matchEndpoints, 'getMatchRosterPreview').mockRejectedValue(new ApiError('forbidden', 'FORBIDDEN', 403));

    renderScreen();

    expect(await screen.findByText('Você não tem permissão para compartilhar a escala deste jogo.')).toBeTruthy();
  });

  it('"Copiar" copies the exact text to the clipboard and shows brief confirmation feedback', async () => {
    jest.spyOn(matchEndpoints, 'getMatchRosterPreview').mockResolvedValue({ text: ROSTER_TEXT });
    jest.useFakeTimers({ legacyFakeTimers: false });

    renderScreen();
    await screen.findByText(ROSTER_TEXT);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Copiar' }));
    });

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith(ROSTER_TEXT);
    expect(await screen.findByRole('button', { name: 'Copiado!' })).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeTruthy();

    jest.useRealTimers();
  });

  it('"Compartilhar" opens the native share sheet with exactly the previewed text', async () => {
    jest.spyOn(matchEndpoints, 'getMatchRosterPreview').mockResolvedValue({ text: ROSTER_TEXT });
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });

    renderScreen();
    await screen.findByText(ROSTER_TEXT);

    fireEvent.press(screen.getByRole('button', { name: 'Compartilhar' }));

    await waitFor(() => expect(shareSpy).toHaveBeenCalledWith({ message: ROSTER_TEXT }));
  });

  it('a share-sheet dismissal (rejected promise) is not surfaced as an error', async () => {
    jest.spyOn(matchEndpoints, 'getMatchRosterPreview').mockResolvedValue({ text: ROSTER_TEXT });
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('User did not share'));

    renderScreen();
    await screen.findByText(ROSTER_TEXT);

    fireEvent.press(screen.getByRole('button', { name: 'Compartilhar' }));

    await waitFor(() => expect(Share.share).toHaveBeenCalled());
    expect(screen.getByText(ROSTER_TEXT)).toBeTruthy();
  });
});
