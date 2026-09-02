import { z } from 'zod';

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/\d/, 'Password must contain at least one number');

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(254, 'Email is too long');

const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-z0-9_]+$/, 'Username may only contain letters, numbers and underscores');

const token = z.string().trim().min(16, 'Token is missing or malformed');

export const registerSchema = {
  body: z
    .object({
      name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
      username,
      email,
      password,
      confirmPassword: z.string().optional(),
    })
    .strict()
    .refine((data) => !data.confirmPassword || data.confirmPassword === data.password, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
};

export const loginSchema = {
  body: z
    .object({
      identifier: z.string().trim().min(3, 'Enter your email or username'),
      password: z.string().min(1, 'Enter your password'),
    })
    .strict(),
};

export const verifyEmailSchema = {
  body: z.object({ token }).strict(),
};

export const resendVerificationSchema = {
  body: z.object({ email }).strict(),
};

export const forgotPasswordSchema = {
  body: z.object({ email }).strict(),
};

export const resetPasswordSchema = {
  body: z.object({ token, password }).strict(),
};

export const changePasswordSchema = {
  body: z
    .object({
      currentPassword: z.string().min(1, 'Enter your current password'),
      newPassword: password,
    })
    .strict(),
};
