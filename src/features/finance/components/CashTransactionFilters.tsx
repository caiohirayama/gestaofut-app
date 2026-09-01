import { View } from 'react-native';
import { ChipSelect } from '@/features/groups/components/ChipSelect';
import type { CashTransactionCategory } from '@/services/api/endpoints/finance';
import { spacing } from '@/theme';
import { CASH_TRANSACTION_CATEGORY_OPTIONS } from '../utils/finance-labels';

const ALL = 'ALL' as const;
type CategoryOption = CashTransactionCategory | typeof ALL;

const CATEGORY_OPTIONS: { value: CategoryOption; label: string }[] = [{ value: ALL, label: 'Todas' }, ...CASH_TRANSACTION_CATEGORY_OPTIONS];

export interface CashTransactionFiltersValue {
  category?: CashTransactionCategory;
}

export interface CashTransactionFiltersProps {
  value: CashTransactionFiltersValue;
  onChange: (value: CashTransactionFiltersValue) => void;
}

/** "Filtros: categoria" (período is `MonthPicker`, kept separate since it also drives the month tiles — same split as `FinanceFilters`/`MonthPicker`). */
export function CashTransactionFilters({ value, onChange }: CashTransactionFiltersProps) {
  return (
    <View style={{ gap: spacing.md }}>
      <ChipSelect
        label="Categoria"
        options={CATEGORY_OPTIONS}
        value={value.category ?? ALL}
        onChange={(category) => onChange({ category: category === ALL ? undefined : category })}
      />
    </View>
  );
}
