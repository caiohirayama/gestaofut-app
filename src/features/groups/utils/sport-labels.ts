import type { SportType } from '@/services/api/endpoints/groups';
import type { ChipOption } from '../components/ChipSelect';

export const SPORT_LABELS: Record<SportType, string> = {
  FOOTBALL: 'Futebol',
  FUTSAL: 'Futsal',
  VOLLEYBALL: 'Vôlei',
  BEACH_TENNIS: 'Beach tennis',
  BASKETBALL: 'Basquete',
  PADEL: 'Padel',
  OTHER: 'Outro',
};

export const SPORT_OPTIONS: ChipOption<SportType>[] = (Object.keys(SPORT_LABELS) as SportType[]).map((value) => ({
  value,
  label: SPORT_LABELS[value],
}));
