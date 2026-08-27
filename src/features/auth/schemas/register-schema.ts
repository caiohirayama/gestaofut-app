import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Informe seu nome')
      .min(2, 'Nome muito curto')
      .max(120, 'Nome muito longo'),
    email: z.string().min(1, 'Informe seu e-mail').email('E-mail inválido'),
    password: z
      .string()
      .min(8, 'Mínimo de 8 caracteres')
      .max(72, 'Máximo de 72 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme sua senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
