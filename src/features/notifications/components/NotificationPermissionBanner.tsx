import { Linking, View } from 'react-native';
import { Button, Card, Text } from '@/components/ui';
import { spacing } from '@/theme';
import type { PushPermissionStatus } from '../utils/push-permission';

export interface NotificationPermissionBannerProps {
  status: PushPermissionStatus;
  onRequest: () => void;
  isRequesting: boolean;
  onRevoke: () => void;
  isRevoking: boolean;
}

/**
 * "PERMISSION: solicitar no momento apropriado, nunca na primeira tela sem
 * contexto" — this banner only ever renders inside the notification center
 * itself (`NotificationsScreen`), never at app start: the user is already
 * looking at notifications, which is exactly the context that makes
 * "quer ativar push?" make sense as a question, instead of a cold dialog
 * before they've even seen what the app does.
 *
 * `denied` gets different copy/action from `undetermined` — the OS will
 * never show its own prompt again once denied (`requestPermissionsAsync`
 * would just resolve `denied` immediately, no dialog), so the only way
 * forward is the device Settings app. `granted` still renders (unlike a
 * pure "ask" banner that would just disappear) — "PERMITIR REVOGAÇÃO" is
 * literally this state's only affordance: turning push back off without
 * leaving the app.
 */
export function NotificationPermissionBanner({ status, onRequest, isRequesting, onRevoke, isRevoking }: NotificationPermissionBannerProps) {
  if (status === 'granted') {
    return (
      <Card style={{ marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="body" color="textSecondary">
          Notificações por push ativadas
        </Text>
        <Text variant="label" color="danger" onPress={isRevoking ? undefined : onRevoke} accessibilityRole="button">
          {isRevoking ? 'Desativando...' : 'Desativar'}
        </Text>
      </Card>
    );
  }

  return (
    <Card style={{ marginBottom: spacing.lg }}>
      <Text variant="bodyStrong">Ative as notificações</Text>
      <Text variant="body" color="textSecondary" style={{ marginTop: spacing.xs }}>
        {status === 'denied'
          ? 'As notificações estão desativadas para o GestãoFut nas configurações do seu dispositivo.'
          : 'Saiba na hora quando um jogo abrir, uma vaga surgir, ou uma oferta estiver expirando.'}
      </Text>
      <View style={{ marginTop: spacing.md }}>
        {status === 'denied' ? (
          <Button label="Abrir configurações" variant="secondary" onPress={() => void Linking.openSettings()} />
        ) : (
          <Button label="Ativar notificações" onPress={onRequest} loading={isRequesting} disabled={isRequesting} />
        )}
      </View>
    </Card>
  );
}
