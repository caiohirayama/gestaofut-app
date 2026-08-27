import { z } from 'zod';
import { MEMBERSHIP_TYPES } from '@/services/api/endpoints/groups';

export const addGroupMemberSchema = z.object({
  userId: z.string().trim().uuid('Informe um ID de usuário válido'),
  membershipType: z.enum(MEMBERSHIP_TYPES),
});

export type AddGroupMemberFormValues = z.infer<typeof addGroupMemberSchema>;
