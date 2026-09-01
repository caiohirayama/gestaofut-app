import type { Ionicons } from '@expo/vector-icons';
import type { NotificationType } from '@/services/api/endpoints/notifications';

type IconName = keyof typeof Ionicons.glyphMap;

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  MATCH_OPENED: 'Jogo aberto',
  CONFIRMATION_PENDING: 'Confirmação pendente',
  WAITLIST_OFFER: 'Vaga disponível',
  OFFER_EXPIRING: 'Oferta expirando',
  MONTHLY_FEE_GENERATED: 'Mensalidade',
  EVENT_OPENED: 'Evento aberto',
  MATCH_REMINDER: 'Lembrete de jogo',
};

export const NOTIFICATION_TYPE_ICON: Record<NotificationType, IconName> = {
  MATCH_OPENED: 'football-outline',
  CONFIRMATION_PENDING: 'help-circle-outline',
  WAITLIST_OFFER: 'checkmark-circle-outline',
  OFFER_EXPIRING: 'time-outline',
  MONTHLY_FEE_GENERATED: 'wallet-outline',
  EVENT_OPENED: 'calendar-outline',
  MATCH_REMINDER: 'alarm-outline',
};
