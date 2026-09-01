import type { BadgeVariant } from '@/components/ui';
import type { ChipOption } from '@/features/groups/components/ChipSelect';
import type {
  CashTransactionCategory,
  CashTransactionStatus,
  CashTransactionType,
  ChargeType,
  MonthlyFeeStatus,
  PaymentMethod,
  PaymentStatus,
} from '@/services/api/endpoints/finance';
import { CASH_TRANSACTION_CATEGORIES } from '@/services/api/endpoints/finance';

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

export const CASH_TRANSACTION_TYPE_LABELS: Record<CashTransactionType, string> = {
  INCOME: 'Entrada',
  EXPENSE: 'Saída',
};

export const CASH_TRANSACTION_CATEGORY_LABELS: Record<CashTransactionCategory, string> = {
  MONTHLY_FEE: 'Mensalidade',
  GUEST_FEE: 'Avulso',
  FIELD_RENTAL: 'Aluguel de campo',
  BARBECUE: 'Churrasco',
  REFEREE: 'Arbitragem',
  BALLS: 'Bolas',
  UNIFORMS: 'Uniformes',
  DRINKS: 'Bebidas',
  OTHER: 'Outro',
};

export const CASH_TRANSACTION_CATEGORY_OPTIONS: ChipOption<CashTransactionCategory>[] = CASH_TRANSACTION_CATEGORIES.map((value) => ({
  value,
  label: CASH_TRANSACTION_CATEGORY_LABELS[value],
}));

export const CASH_TRANSACTION_STATUS_LABELS: Record<CashTransactionStatus, string> = {
  CONFIRMED: 'Confirmado',
  CANCELLED: 'Cancelado',
};

export const CASH_TRANSACTION_STATUS_BADGE_VARIANT: Record<CashTransactionStatus, BadgeVariant> = {
  CONFIRMED: 'success',
  CANCELLED: 'neutral',
};
