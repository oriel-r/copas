import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'user']).default('admin'),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const banUserSchema = z.object({
  userId: z.string(),
  reason: z.string().optional(),
});

export type BanUserFormValues = z.infer<typeof banUserSchema>;
