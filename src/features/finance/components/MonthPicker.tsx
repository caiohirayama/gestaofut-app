import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { formatMonthLabel, shiftYearMonth, type YearMonth } from '../utils/finance-datetime';

export interface MonthPickerProps {
  value: YearMonth;
  onChange: (value: YearMonth) => void;
}

/** "Filtros: mês" — a simple prev/next stepper instead of a calendar picker, matching the project's no-new-dependency-for-UI approach. */
export function MonthPicker({ value, onChange }: MonthPickerProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable
        onPress={() => onChange(shiftYearMonth(value, -1))}
        accessibilityRole="button"
        accessibilityLabel="Mês anterior"
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={22} color={colors.primary} />
      </Pressable>
      <Text variant="bodyStrong">{formatMonthLabel(value)}</Text>
      <Pressable
        onPress={() => onChange(shiftYearMonth(value, 1))}
        accessibilityRole="button"
        accessibilityLabel="Próximo mês"
        hitSlop={8}
        style={{ paddingHorizontal: spacing.xs }}
      >
        <Ionicons name="chevron-forward" size={22} color={colors.primary} />
      </Pressable>
    </View>
  );
}
