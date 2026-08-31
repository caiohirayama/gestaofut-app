import { z } from 'zod';
import { EVENT_TYPES } from '@/services/api/endpoints/events';

/**
 * `durationMinutes` stays a free-text string in form state (RN `TextInput`
 * values are always strings, mirrors `group-settings-schema.ts`'s own
 * numeric fields) — parsed to a number only at submit time, in
 * `event-form-datetime.ts`'s `toEventDates`.
 */
export const eventFormSchema = z.object({
  title: z.string().trim().min(1, 'Informe um título'),
  type: z.enum(EVENT_TYPES),
  description: z.string().trim().optional(),
  locationName: z.string().trim().optional(),
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

export type EventFormValues = z.infer<typeof eventFormSchema>;
