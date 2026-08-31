import { View } from 'react-native';
import { ChipSelect } from '@/features/groups/components/ChipSelect';
import { displayNameForMember } from '@/features/groups/utils/member-display';
import type { GroupMember } from '@/services/api/endpoints/groups';
import type { MonthlyFeeStatus } from '@/services/api/endpoints/finance';
import { spacing } from '@/theme';
import { FINANCE_STATUS_LABELS } from '../utils/finance-labels';
import type { FinanceItemKind } from '../utils/finance-summary';

const ALL = 'ALL' as const;
type StatusOption = MonthlyFeeStatus | typeof ALL;
type KindOption = FinanceItemKind | typeof ALL;

const STATUS_OPTIONS: { value: StatusOption; label: string }[] = [
  { value: ALL, label: 'Todos' },
  ...(Object.keys(FINANCE_STATUS_LABELS) as MonthlyFeeStatus[]).map((status) => ({
    value: status,
    label: FINANCE_STATUS_LABELS[status],
  })),
];

const KIND_OPTIONS: { value: KindOption; label: string }[] = [
  { value: ALL, label: 'Todos' },
  { value: 'MONTHLY_FEE', label: 'Mensalidade' },
  { value: 'MANUAL', label: 'Avulso' },
  { value: 'GUEST_MATCH_FEE', label: 'Avulso (jogo)' },
];

export interface FinanceFiltersValue {
  status?: MonthlyFeeStatus;
  kind?: FinanceItemKind;
  groupMemberId?: string;
}

export interface FinanceFiltersProps {
  value: FinanceFiltersValue;
  onChange: (value: FinanceFiltersValue) => void;
  members: GroupMember[];
  currentUserId: string | undefined;
}

/** "Filtros: status; tipo; jogador" (mês is `MonthPicker`, kept separate since it also drives the dashboard). */
export function FinanceFilters({ value, onChange, members, currentUserId }: FinanceFiltersProps) {
  const playerOptions = [
    { value: ALL, label: 'Todos' },
    ...members.map((member) => ({ value: member.id, label: displayNameForMember(member.userId, currentUserId) })),
  ];

  return (
    <View style={{ gap: spacing.md }}>
      <ChipSelect
        label="Status"
        options={STATUS_OPTIONS}
        value={value.status ?? ALL}
        onChange={(status) => onChange({ ...value, status: status === ALL ? undefined : status })}
      />
      <ChipSelect
        label="Tipo"
        options={KIND_OPTIONS}
        value={value.kind ?? ALL}
        onChange={(kind) => onChange({ ...value, kind: kind === ALL ? undefined : kind })}
      />
      <ChipSelect
        label="Jogador"
        options={playerOptions}
        value={value.groupMemberId ?? ALL}
        onChange={(groupMemberId) => onChange({ ...value, groupMemberId: groupMemberId === ALL ? undefined : groupMemberId })}
      />
    </View>
  );
}
