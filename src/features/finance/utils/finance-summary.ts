import type { Charge, MonthlyFee, MonthlyFeeStatus } from '@/services/api/endpoints/finance';
import { sumMoney } from './money';

export interface FinanceDashboardTotals {
  /** Total mensalidade billed for the month, regardless of status. */
  previsto: string;
  /** Mensalidade actually PAID for the month. */
  recebido: string;
  /** Mensalidade still PENDING or OVERDUE for the month. */
  pendente: string;
  /** Total avulso (cobranças) billed for the month, regardless of status. */
  avulsos: string;
}

/**
 * A charge has no `referenceYear`/`referenceMonth` like a monthly fee does
 * (it's not tied to a recurring period) — "which month does this belong
 * to" falls back to `dueDate`, or `createdAt` when there's no due date
 * (a MANUAL charge can be created without one).
 */
function chargeReferenceDate(charge: Charge): Date {
  return new Date(charge.dueDate ?? charge.createdAt);
}

function belongsToMonth(date: Date, year: number, month: number): boolean {
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month;
}

/** "Dashboard mensal": previsto/recebido/pendente/avulsos for one (year, month) — see gestaofut-app docs/finance.md. */
export function computeDashboardTotals(
  monthlyFees: MonthlyFee[],
  charges: Charge[],
  referenceYear: number,
  referenceMonth: number,
): FinanceDashboardTotals {
  const feesForMonth = monthlyFees.filter(
    (fee) => fee.referenceYear === referenceYear && fee.referenceMonth === referenceMonth,
  );
  const chargesForMonth = charges.filter((charge) => belongsToMonth(chargeReferenceDate(charge), referenceYear, referenceMonth));

  return {
    previsto: sumMoney(feesForMonth.map((fee) => fee.amount)),
    recebido: sumMoney(feesForMonth.filter((fee) => fee.status === 'PAID').map((fee) => fee.amount)),
    pendente: sumMoney(feesForMonth.filter((fee) => fee.status === 'PENDING' || fee.status === 'OVERDUE').map((fee) => fee.amount)),
    avulsos: sumMoney(chargesForMonth.map((charge) => charge.amount)),
  };
}

/** A row in the unified "lista de pendências" — a MonthlyFee and a Charge normalized to one shape so both can be filtered/rendered together. `kind` doubles as the "tipo" filter value. */
export type FinanceItemKind = 'MONTHLY_FEE' | 'MANUAL' | 'GUEST_MATCH_FEE';

export interface FinanceListItem {
  readonly id: string;
  readonly kind: FinanceItemKind;
  readonly groupMemberId: string;
  readonly amount: string;
  readonly status: MonthlyFeeStatus;
  readonly dueDate: string | null;
  readonly description: string | null;
  readonly referenceDate: Date;
  readonly source: MonthlyFee | Charge;
}

export function toFinanceListItems(monthlyFees: MonthlyFee[], charges: Charge[]): FinanceListItem[] {
  const feeItems: FinanceListItem[] = monthlyFees.map((fee) => ({
    id: fee.id,
    kind: 'MONTHLY_FEE',
    groupMemberId: fee.groupMemberId,
    amount: fee.amount,
    status: fee.status,
    dueDate: fee.dueDate,
    description: null,
    referenceDate: new Date(fee.dueDate),
    source: fee,
  }));
  const chargeItems: FinanceListItem[] = charges.map((charge) => ({
    id: charge.id,
    kind: charge.type,
    groupMemberId: charge.groupMemberId,
    amount: charge.amount,
    status: charge.status,
    dueDate: charge.dueDate,
    description: charge.description,
    referenceDate: chargeReferenceDate(charge),
    source: charge,
  }));

  return [...feeItems, ...chargeItems].sort((a, b) => a.referenceDate.getTime() - b.referenceDate.getTime());
}

const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/** One-line description for a pendência row: the mensalidade's period, or the avulso's own description/type label. */
export function describeFinanceListItem(item: FinanceListItem): string {
  if (item.kind === 'MONTHLY_FEE') {
    const fee = item.source as MonthlyFee;
    return `Mensalidade — ${MONTH_NAMES[fee.referenceMonth - 1]} de ${fee.referenceYear}`;
  }
  const charge = item.source as Charge;
  return charge.description ?? (item.kind === 'GUEST_MATCH_FEE' ? 'Avulso de jogo' : 'Avulso');
}

export interface FinanceListFilters {
  readonly referenceYear?: number;
  readonly referenceMonth?: number;
  readonly status?: MonthlyFeeStatus;
  readonly kind?: FinanceItemKind;
  readonly groupMemberId?: string;
}

/** "Filtros: mês; status; tipo; jogador" — all client-side over one unfiltered fetch, same rationale as `upcomingMatches`/`matchHistory` (the API only accepts one filter dimension at a time per list). */
export function filterFinanceListItems(items: FinanceListItem[], filters: FinanceListFilters): FinanceListItem[] {
  return items.filter((item) => {
    if (filters.status !== undefined && item.status !== filters.status) return false;
    if (filters.kind !== undefined && item.kind !== filters.kind) return false;
    if (filters.groupMemberId !== undefined && item.groupMemberId !== filters.groupMemberId) return false;
    if (filters.referenceYear !== undefined && filters.referenceMonth !== undefined) {
      if (!belongsToMonth(item.referenceDate, filters.referenceYear, filters.referenceMonth)) return false;
    }
    return true;
  });
}
