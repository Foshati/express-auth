import express, { Router, RequestHandler } from 'express';
import {
  getUser,
  resendOtp,
  userForgotPassword,
  userLogin,
  userRefreshToken,
  userRegistration,
  userResetPassword,
  userVerify,
  userVerifyForgotPasswordOtp,
  validateField,
} from '../controllers/auth.controller';
import {
  RegistrationSchema,
  OtpVerificationSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ForgotPasswordVerificationSchema,
  ResetPasswordSchema,
  ResendOtpSchema,
  FieldValidationSchema,
} from '../schemas/auth.schema';
import { validate } from '../middleware/error-handler';
import { isAuthenticated } from '../middleware/isAuthenticated';

const router: Router = express.Router();

// Auth Routes
router.post('/api/v1/auth/register', validate(RegistrationSchema), userRegistration);

/**
 * POST /api/v1/auth/verify
 * @summary Verify OTP
 * @description This endpoint verifies the One-Time Password (OTP) sent to the user's email.
 * @param {object} request.body - User verification details
 * @property {string} request.body.email.required - User's email address
 * @property {string} request.body.otp.required - One-time password (4 digits)
 * @example request.body
 * {
 *   "email": "user@example.com",
 *   "otp": "1234"
 * }
 */
router.post('/api/v1/auth/verify', validate(OtpVerificationSchema), userVerify);
router.post('/api/v1/auth/login', validate(LoginSchema), userLogin);
router.post('/api/v1/auth/refresh-token', userRefreshToken);

// Password Management
router.post('/api/v1/auth/forgot-password', validate(ForgotPasswordSchema), userForgotPassword);
router.post(
  '/api/v1/auth/forgot-password/verify',
  validate(ForgotPasswordVerificationSchema),
  userVerifyForgotPasswordOtp
);
router.post('/api/v1/auth/reset-password', validate(ResetPasswordSchema), userResetPassword);

// User Profile
router.get('/api/v1/users/me', isAuthenticated as RequestHandler, getUser);

// Utilities
router.post('/api/v1/utils/resend-otp', validate(ResendOtpSchema), resendOtp);
router.post('/api/v1/utils/validate-field', validate(FieldValidationSchema), validateField);

export default router;
