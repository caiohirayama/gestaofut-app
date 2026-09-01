import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Share, View } from 'react-native';
import { Button, Card, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { getApiErrorMessage } from '@/services/api/error-message';
import { useGroupStore } from '@/store/group-store';
import { spacing } from '@/theme';
import { useMatchRosterPreview } from '../hooks/useMatchRoster';

const COPIED_FEEDBACK_MS = 2000;

/**
 * "Compartilhar escala" — FLUXO: (1) `useMatchRosterPreview` já solicitou o
 * preview à API assim que esta tela monta; (2) esta tela é o próprio
 * preview — o admin vê exatamente o texto que será compartilhado, nunca um
 * resumo diferente; (3)/(4) "Copiar" (`expo-clipboard`) e "Compartilhar"
 * (`Share.share` nativo do RN — o WhatsApp aparece ali sozinho quando
 * instalado, sem nenhuma integração própria com a API do WhatsApp).
 *
 * Nada além do texto e dos dois botões aparece aqui — "não expor
 * informações administrativas" além do que o próprio texto (já livre de
 * telefone/email/valor devido, ver gestaofut-api docs/matches.md) contém.
 */
export function MatchRosterPreviewScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const groupId = useGroupStore((state) => state.activeGroupId);
  const { data: text, isPending, isError, error, refetch } = useMatchRosterPreview(groupId ?? undefined, matchId);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  }

  async function handleShare() {
    if (!text) return;
    try {
      await Share.share({ message: text });
    } catch {
      // The user backing out of the native share sheet is not an error worth surfacing.
    }
  }

  if (isPending) {
    return (
      <Screen>
        <LoadingState label="Gerando escala..." />
      </Screen>
    );
  }

  if (isError || !text) {
    return (
      <Screen>
        <ErrorState
          title="Não foi possível gerar a escala"
          message={getApiErrorMessage(error, { FORBIDDEN: 'Você não tem permissão para compartilhar a escala deste jogo.' })}
          onRetry={refetch}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ marginTop: spacing.xxl, marginBottom: spacing.xl }}>
        <Text variant="title">Escala do jogo</Text>
      </View>

      <Card style={{ marginBottom: spacing.xl }}>
        <Text variant="body" selectable style={{ fontFamily: 'monospace' }}>
          {text}
        </Text>
      </Card>

      <View style={{ gap: spacing.sm }}>
        <Button label={copied ? 'Copiado!' : 'Copiar'} variant="secondary" onPress={handleCopy} />
        <Button label="Compartilhar" onPress={handleShare} />
      </View>
    </Screen>
  );
}
