import { apiFetch } from '../client';

export const MONTHLY_FEE_STATUSES = ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'WAIVED'] as const;
export type MonthlyFeeStatus = (typeof MONTHLY_FEE_STATUSES)[number];

export const CHARGE_TYPES = ['MANUAL', 'GUEST_MATCH_FEE'] as const;
export type ChargeType = (typeof CHARGE_TYPES)[number];

/** Charges share the same status enum as monthly fees — see gestaofut-api docs/finance.md. */
export type ChargeStatus = MonthlyFeeStatus;

export const PAYMENT_METHODS = ['PIX', 'CASH', 'TRANSFER', 'OTHER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** `amount`/`dueDate` mirror gestaofut-api's raw shape: `amount` stays a NUMERIC string (never parse to number, see its docs/database.md); `dueDate` is a plain `YYYY-MM-DD` date string. */
export interface MonthlyFee {
  id: string;
  groupId: string;
  groupMemberId: string;
  referenceYear: number;
  referenceMonth: number;
  amount: string;
  dueDate: string;
  status: MonthlyFeeStatus;
  createdAt: string;
  paidAt: string | null;
}

export interface Charge {
  id: string;
  groupId: string;
  groupMemberId: string;
  type: ChargeType;
  matchParticipantId: string | null;
  description: string | null;
  amount: string;
  dueDate: string | null;
  status: ChargeStatus;
  createdAt: string;
  paidAt: string | null;
}

export interface Payment {
  id: string;
  organizationId: string;
  groupId: string;
  payerUserId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
}

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  monthlyFeeId: string | null;
  chargeId: string | null;
  amount: string;
  createdAt: string;
}

export interface PaymentWithAllocations extends Payment {
  allocations: PaymentAllocation[];
}

export interface MonthlyFeeFilters {
  groupMemberId?: string;
  status?: MonthlyFeeStatus;
  referenceYear?: number;
  referenceMonth?: number;
}

export interface ChargeFilters {
  groupMemberId?: string;
  status?: ChargeStatus;
  type?: ChargeType;
}

export interface PaymentFilters {
  payerUserId?: string;
  status?: PaymentStatus;
}

/** Accepts any of this file's `*Filters` interfaces — all plain objects of optional string/number fields, just shaped differently per endpoint. */
function toQueryString(filters: object): string {
  const params = Object.entries(filters).filter(
    (entry): entry is [string, string | number] => entry[1] !== undefined,
  );
  if (params.length === 0) return '';
  return `?${params.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')}`;
}

/** ADMIN (finance.read): the whole group's mensalidades. */
export function listMonthlyFees(
  groupId: string,
  filters?: MonthlyFeeFilters,
  signal?: AbortSignal,
): Promise<{ monthlyFees: MonthlyFee[] }> {
  return apiFetch<{ monthlyFees: MonthlyFee[] }>(
    `/groups/${groupId}/finance/monthly-fees${toQueryString(filters ?? {})}`,
    { signal },
  );
}

/** Self-service (group.read): only the caller's own mensalidades. */
export function listMyMonthlyFees(groupId: string, signal?: AbortSignal): Promise<{ monthlyFees: MonthlyFee[] }> {
  return apiFetch<{ monthlyFees: MonthlyFee[] }>(`/groups/${groupId}/finance/monthly-fees/me`, { signal });
}

export function waiveMonthlyFee(groupId: string, feeId: string): Promise<MonthlyFee> {
  return apiFetch<MonthlyFee>(`/groups/${groupId}/finance/monthly-fees/${feeId}/waive`, { method: 'POST' });
}

export function cancelMonthlyFee(groupId: string, feeId: string): Promise<MonthlyFee> {
  return apiFetch<MonthlyFee>(`/groups/${groupId}/finance/monthly-fees/${feeId}/cancel`, { method: 'POST' });
}

export function listCharges(groupId: string, filters?: ChargeFilters, signal?: AbortSignal): Promise<{ charges: Charge[] }> {
  return apiFetch<{ charges: Charge[] }>(`/groups/${groupId}/finance/charges${toQueryString(filters ?? {})}`, { signal });
}

export function listMyCharges(groupId: string, signal?: AbortSignal): Promise<{ charges: Charge[] }> {
  return apiFetch<{ charges: Charge[] }>(`/groups/${groupId}/finance/charges/me`, { signal });
}

export interface CreateChargeInput {
  groupMemberId: string;
  amount: string;
  description?: string | null;
  dueDate?: string | null;
}

export function createCharge(groupId: string, input: CreateChargeInput): Promise<Charge> {
  return apiFetch<Charge>(`/groups/${groupId}/finance/charges`, { method: 'POST', body: input });
}

export function waiveCharge(groupId: string, chargeId: string): Promise<Charge> {
  return apiFetch<Charge>(`/groups/${groupId}/finance/charges/${chargeId}/waive`, { method: 'POST' });
}

export function cancelCharge(groupId: string, chargeId: string): Promise<Charge> {
  return apiFetch<Charge>(`/groups/${groupId}/finance/charges/${chargeId}/cancel`, { method: 'POST' });
}

export function listPayments(groupId: string, filters?: PaymentFilters, signal?: AbortSignal): Promise<{ payments: Payment[] }> {
  return apiFetch<{ payments: Payment[] }>(`/groups/${groupId}/finance/payments${toQueryString(filters ?? {})}`, { signal });
}

export function listMyPayments(groupId: string, signal?: AbortSignal): Promise<{ payments: Payment[] }> {
  return apiFetch<{ payments: Payment[] }>(`/groups/${groupId}/finance/payments/me`, { signal });
}

export type FinanceBillableType = 'MONTHLY_FEE' | 'CHARGE';

export interface RecordPaymentInput {
  payerUserId: string;
  paymentMethod: PaymentMethod;
  billables: { type: FinanceBillableType; id: string }[];
}

/** Always starts PENDING — see gestaofut-api docs/finance.md. `amount` is never sent by the client: the server sums the billables' own amounts. */
export function recordPayment(groupId: string, input: RecordPaymentInput): Promise<PaymentWithAllocations> {
  return apiFetch<PaymentWithAllocations>(`/groups/${groupId}/finance/payments`, { method: 'POST', body: input });
}

export function confirmPayment(groupId: string, paymentId: string): Promise<Payment> {
  return apiFetch<Payment>(`/groups/${groupId}/finance/payments/${paymentId}/confirm`, { method: 'POST' });
}

export function cancelPayment(groupId: string, paymentId: string): Promise<Payment> {
  return apiFetch<Payment>(`/groups/${groupId}/finance/payments/${paymentId}/cancel`, { method: 'POST' });
}

export function refundPayment(groupId: string, paymentId: string): Promise<Payment> {
  return apiFetch<Payment>(`/groups/${groupId}/finance/payments/${paymentId}/refund`, { method: 'POST' });
}
