import { z } from 'zod';

/**
 * `durationMinutes` stays a free-text string in form state (RN `TextInput`
 * values are always strings, mirrors `event-form-schema.ts`'s own numeric
 * field) — parsed to a number only at submit time, in
 * `match-form-datetime.ts`'s `toMatchDates`.
 */
export const matchFormSchema = z.object({
  locationName: z.string().trim().optional(),
  locationAddress: z.string().trim().optional(),
  date: z
    .string()
    .trim()
    .regex(/^(\d{2})\/(\d{2})\/(\d{4})$/, 'Use o formato DD/MM/AAAA'),
  startTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Use o formato HH:MM'),
  durationMinutes: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Informe um número inteiro de minutos')
    .refine((value) => Number.parseInt(value, 10) > 0, 'A duração deve ser maior que zero'),
});

export type MatchFormValues = z.infer<typeof matchFormSchema>;
