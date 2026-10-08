import { z } from 'zod';
export const loginSchema = z.object({
  email: z.string().email('Invalid email').toLowerCase(),
  password: z.string().min(1, 'Password required'),
});
export const registerSchema = z.object({
  name: z.string().min(2,'Name too short').max(64),
  email: z.string().email('Invalid email').toLowerCase(),
  password: z.string().min(8,'Min 8 characters').max(128).regex(/[A-Z]/,'Need uppercase').regex(/[a-z]/,'Need lowercase').regex(/[0-9]/,'Need number'),
  confirmPassword: z.string(),
}).refine(d=>d.password===d.confirmPassword,{message:'Passwords do not match',path:['confirmPassword']});
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email').toLowerCase(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
