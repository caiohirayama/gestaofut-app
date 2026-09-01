import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { Button, Input, Screen, Text } from '@/components/ui';
import { ChipSelect } from '@/features/groups/components/ChipSelect';
import { getApiErrorMessage } from '@/services/api/error-message';
import { useGroupStore } from '@/store/group-store';
import { spacing } from '@/theme';
import { useCreateManualCashExpense } from '../hooks/useCashTransactions';
import { cashExpenseFormSchema, type CashExpenseFormValues } from '../schemas/cash-expense-form-schema';
import { parseOccurredAtInput } from '../utils/finance-datetime';
import { CASH_TRANSACTION_CATEGORY_OPTIONS } from '../utils/finance-labels';
import { normalizeAmountInput } from '../utils/money';

const EMPTY_VALUES: CashExpenseFormValues = {
  category: 'OTHER',
  amount: '',
  description: '',
  occurredAt: '',
};

/**
 * "+ Nova despesa" / "+ Novo lançamento" — the app's single manual-entry
 * form (see `cash-expense-form-schema.ts` for why there's no "type" field:
 * a manual entry is always an EXPENSE). Mirrors `EventFormScreen`'s
 * structure (React Hook Form + zodResolver + `ChipSelect`).
 */
export function CashExpenseFormScreen() {
  const groupId = useGroupStore((state) => state.activeGroupId);
  const createExpense = useCreateManualCashExpense(groupId ?? '');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CashExpenseFormValues>({
    resolver: zodResolver(cashExpenseFormSchema),
    mode: 'onBlur',
    defaultValues: EMPTY_VALUES,
  });

  async function onSubmit(values: CashExpenseFormValues) {
    if (!groupId) return;
    const amount = normalizeAmountInput(values.amount);
    const occurredAt = parseOccurredAtInput(values.occurredAt);
    if (!amount || !occurredAt.ok) return;

    try {
      await createExpense.mutateAsync({
        category: values.category,
        amount,
        description: values.description || null,
        occurredAt: occurredAt.isoDate,
      });
      router.back();
    } catch {
      // surfaced via mutation.error below
    }
  }

  return (
    <Screen scroll>
      <View style={{ marginTop: spacing.xxl, marginBottom: spacing.xl }}>
        <Text variant="title">Nova despesa</Text>
      </View>

      <View style={{ gap: spacing.lg }}>
        <Controller
          control={control}
          name="category"
          render={({ field: { value, onChange } }) => (
            <ChipSelect label="Categoria" options={CASH_TRANSACTION_CATEGORY_OPTIONS} value={value} onChange={onChange} error={errors.category?.message} />
          )}
        />

        <Controller
          control={control}
          name="amount"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Valor"
              placeholder="60,00"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.amount?.message}
              keyboardType="decimal-pad"
            />
          )}
        />

        <Controller
          control={control}
          name="occurredAt"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Data"
              placeholder="DD/MM/AAAA (padrão: hoje)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.occurredAt?.message}
              keyboardType="number-pad"
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Descrição"
              placeholder="Detalhes da despesa (opcional)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.description?.message}
              multiline
            />
          )}
        />

        {createExpense.isError ? (
          <Text variant="caption" color="danger" accessibilityRole="alert">
            {getApiErrorMessage(createExpense.error)}
          </Text>
        ) : null}

        <Button label="Registrar despesa" onPress={handleSubmit(onSubmit)} loading={isSubmitting || createExpense.isPending} disabled={!isValid || createExpense.isPending} />
      </View>
    </Screen>
  );
}
