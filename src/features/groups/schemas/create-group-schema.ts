import { z } from 'zod';
import { SPORT_TYPES } from '@/services/api/endpoints/groups';

export const createGroupSchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto').max(120),
  description: z.string().trim().max(2000).optional(),
  sportType: z.enum(SPORT_TYPES, { message: 'Selecione uma modalidade' }),
  timezone: z.string().trim().min(1, 'Informe o fuso horário'),
});

export type CreateGroupFormValues = z.infer<typeof createGroupSchema>;
