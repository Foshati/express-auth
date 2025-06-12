import { z } from 'zod';

// Email regex pattern
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Base user schema
export const UserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters'),
  email: z.string().email('Invalid email format').regex(emailRegex, 'Invalid email format'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// Registration schema
export const RegistrationSchema = UserSchema.pick({
  name: true,
  email: true,
  username: true,
  password: true,
});

// OTP Verification schema - updated to accept 4-digit OTPs
export const OtpVerificationSchema = UserSchema.extend({
  otp: z
    .string()
    .length(4, 'OTP must be 4 characters')
    .regex(/^\d+$/, 'OTP must contain only numbers'),
});

// Login schema
export const LoginSchema = z.object({
  email: z.string().email('Invalid email format').regex(emailRegex, 'Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Forgot password schema
export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format').regex(emailRegex, 'Invalid email format'),
});

// Forgot password verification schema - updated to accept 4-digit OTPs
export const ForgotPasswordVerificationSchema = z.object({
  email: z.string().email('Invalid email format'),
  otp: z
    .string()
    .length(4, 'OTP must be 4 characters')
    .regex(/^\d+$/, 'OTP must contain only numbers'),
});

// Reset password schema
export const ResetPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// Resend OTP schema
export const ResendOtpSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().optional(),
});

// Field validation schema
export const FieldValidationSchema = z.object({
  field: z.enum(['email', 'username'], { message: "Field must be either 'email' or 'username'" }),
  value: z.string().min(1, 'Value cannot be empty'),
});
