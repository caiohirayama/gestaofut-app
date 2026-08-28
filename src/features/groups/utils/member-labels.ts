import type { GroupMember } from '@/services/api/endpoints/groups';
import type { ChipOption } from '../components/ChipSelect';

export const MEMBERSHIP_LABELS: Record<GroupMember['membershipType'], string> = {
  REGULAR: 'Mensalista',
  GOALKEEPER: 'Goleiro',
  GUEST: 'Avulso',
};

export const MEMBERSHIP_OPTIONS: ChipOption<GroupMember['membershipType']>[] = (
  Object.keys(MEMBERSHIP_LABELS) as GroupMember['membershipType'][]
).map((value) => ({ value, label: MEMBERSHIP_LABELS[value] }));

export const STATUS_LABELS: Record<GroupMember['status'], string> = {
  ACTIVE: 'Ativo',
  SUSPENDED: 'Suspenso',
  INACTIVE: 'Inativo',
};

export const STATUS_BADGE_VARIANT: Record<GroupMember['status'], 'success' | 'warning' | 'neutral'> = {
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  INACTIVE: 'neutral',
};
