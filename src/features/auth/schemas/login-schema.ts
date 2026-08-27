import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Informe seu e-mail').email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo de 6 caracteres'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
