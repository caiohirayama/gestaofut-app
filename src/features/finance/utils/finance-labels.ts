import type { BadgeVariant } from '@/components/ui';
import type { ChargeType, MonthlyFeeStatus, PaymentMethod, PaymentStatus } from '@/services/api/endpoints/finance';

/** Shared by MonthlyFee and Charge — both use the same status enum, see gestaofut-api docs/finance.md. */
export const FINANCE_STATUS_LABELS: Record<MonthlyFeeStatus, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  OVERDUE: 'Vencido',
  CANCELLED: 'Cancelado',
  WAIVED: 'Perdoado',
};

export const FINANCE_STATUS_BADGE_VARIANT: Record<MonthlyFeeStatus, BadgeVariant> = {
  PENDING: 'neutral',
  PAID: 'success',
  OVERDUE: 'danger',
  CANCELLED: 'neutral',
  WAIVED: 'neutral',
};

/** Statuses a pendência can still be acted on from (paid via a manual payment) — see gestaofut-api's `RecordPaymentUseCase`. */
export const PAYABLE_STATUSES: readonly MonthlyFeeStatus[] = ['PENDING', 'OVERDUE'];

export const CHARGE_TYPE_LABELS: Record<ChargeType, string> = {
  MANUAL: 'Avulso',
  GUEST_MATCH_FEE: 'Avulso (jogo)',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  CASH: 'Dinheiro',
  TRANSFER: 'Transferência',
  OTHER: 'Outro',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Estornado',
};
