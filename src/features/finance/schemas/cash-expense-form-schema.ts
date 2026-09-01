import { z } from 'zod';
import { CASH_TRANSACTION_CATEGORIES } from '@/services/api/endpoints/finance';
import { normalizeAmountInput } from '../utils/money';
import { parseOccurredAtInput } from '../utils/finance-datetime';

/**
 * "+ Nova despesa" / "+ Novo lançamento" — this UI's single manual-entry
 * form, since a manual `CashTransaction` can only ever be an EXPENSE (see
 * gestaofut-api docs/finance.md, "CAIXA"). `amount`/`occurredAt` stay
 * free-text strings in form state (RN `TextInput` values are always
 * strings, mirrors `event-form-schema.ts`) — normalized only at submit
 * time (`normalizeAmountInput`/`parseOccurredAtInput`).
 */
export const cashExpenseFormSchema = z.object({
  category: z.enum(CASH_TRANSACTION_CATEGORIES),
  amount: z
    .string()
    .trim()
    .min(1, 'Informe um valor')
    .refine((value) => normalizeAmountInput(value) !== null, 'Informe um valor positivo (ex.: 60,00)'),
  description: z.string().trim().optional(),
  occurredAt: z
    .string()
    .trim()
    .refine((value) => parseOccurredAtInput(value).ok, 'Use o formato DD/MM/AAAA'),
});

export type CashExpenseFormValues = z.infer<typeof cashExpenseFormSchema>;
