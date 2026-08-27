import { z } from 'zod';

const optionalDigits = z
  .string()
  .trim()
  .regex(/^\d*$/, 'Use apenas números')
  .optional();

const optionalMoney = z
  .string()
  .trim()
  .regex(/^(\d+(\.\d{1,2})?)?$/, 'Use um valor como 50.00')
  .optional();

/**
 * "Configurações básicas" only — covers the fields exposed in
 * `GroupSettingsScreen`. `monthlyBarbecueEnabled`/`defaultMatchWeekday`/
 * `defaultMatchTime`/`defaultMatchDurationMinutes`/
 * `waitlistOfferTimeoutMinutes` exist in the API but aren't in this first
 * screen (no boolean-toggle primitive in the design system yet, and the
 * match-scheduling defaults belong closer to a future Jogos feature).
 *
 * Every numeric/money field is a free-text string here (RN `TextInput`
 * values are always strings) and deliberately allows an empty string —
 * that's how the form represents "clear this setting" (mapped to an
 * explicit `null` in the API payload, distinct from omitting the field —
 * see gestaofut-api docs/multi-tenancy.md).
 */
export const groupSettingsFormSchema = z.object({
  maxRegularPlayers: optionalDigits,
  maxGoalkeepers: optionalDigits,
  monthlyFee: optionalMoney,
  guestFee: optionalMoney,
  confirmationDeadlineHours: optionalDigits,
  currency: z.string().trim().length(3, 'Use o código de 3 letras (ex.: BRL)'),
  timezone: z.string().trim().min(1, 'Informe o fuso horário'),
});

export type GroupSettingsFormValues = z.infer<typeof groupSettingsFormSchema>;

function toIntOrNull(value: string | undefined): number | null | undefined {
  if (value === undefined) return undefined;
  return value === '' ? null : Number.parseInt(value, 10);
}

function toStringOrNull(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  return value === '' ? null : value;
}

/** Maps form strings to the API payload: `''` becomes an explicit `null` (clear), never omitted. */
export function toUpdateGroupSettingsInput(values: GroupSettingsFormValues) {
  return {
    maxRegularPlayers: toIntOrNull(values.maxRegularPlayers),
    maxGoalkeepers: toIntOrNull(values.maxGoalkeepers),
    monthlyFee: toStringOrNull(values.monthlyFee),
    guestFee: toStringOrNull(values.guestFee),
    confirmationDeadlineHours: toIntOrNull(values.confirmationDeadlineHours),
    currency: values.currency.toUpperCase(),
    timezone: values.timezone,
  };
}

/** Maps the API's GroupSettings back to form strings (null -> ''). */
export function fromGroupSettings(settings: {
  maxRegularPlayers: number | null;
  maxGoalkeepers: number | null;
  monthlyFee: string | null;
  guestFee: string | null;
  confirmationDeadlineHours: number | null;
  currency: string;
  timezone: string;
}): GroupSettingsFormValues {
  return {
    maxRegularPlayers: settings.maxRegularPlayers?.toString() ?? '',
    maxGoalkeepers: settings.maxGoalkeepers?.toString() ?? '',
    monthlyFee: settings.monthlyFee ?? '',
    guestFee: settings.guestFee ?? '',
    confirmationDeadlineHours: settings.confirmationDeadlineHours?.toString() ?? '',
    currency: settings.currency,
    timezone: settings.timezone,
  };
}
