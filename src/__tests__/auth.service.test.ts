import * as authService from '../services/auth.service';
import { prisma } from '../libs/prisma';
import { ValidationError } from '../middleware/error-handler';
import { sendEmail } from '../utils/sendMail';
import { redisClient } from '../libs/redis';
import { jest } from '@jest/globals';
import type { SpyInstance } from 'jest-mock';
import type { User } from '@prisma/client';

type MockedSendEmail = jest.MockedFunction<typeof sendEmail>;
type MockedRedisGet = jest.MockedFunction<typeof redisClient.get>;
type MockedRedisSet = jest.MockedFunction<typeof redisClient.set>;

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  })),
}));

// Mock Redis
jest.mock('../libs/redis', () => ({
  redisClient: {
    get: jest.fn().mockImplementation(() => Promise.resolve(null)),
    set: jest.fn().mockImplementation(() => Promise.resolve('OK')),
    del: jest.fn().mockImplementation(() => Promise.resolve(1)),
  },
}));

// Mock sendEmail
jest.mock('../utils/sendMail', () => ({
  sendEmail: jest.fn().mockImplementation(() => Promise.resolve(true)),
}));

describe('Auth Service', () => {
  let consoleSpy: SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    await prisma.user.deleteMany();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('validateRegistrationData', () => {
    const validUserData = {
      name: 'Test User',
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test123!@#',
      phone_number: '1234567890',
      country: 'Iran',
    };

    it('should validate user registration data successfully', () => {
      expect(() => authService.validateRegistrationData(validUserData, 'user')).not.toThrow();
    });

    it('should validate seller registration data successfully', () => {
      expect(() => authService.validateRegistrationData(validUserData, 'seller')).not.toThrow();
    });

    it('should throw error for missing required fields in user registration', () => {
      const invalidData = { ...validUserData, password: '' };
      expect(() => authService.validateRegistrationData(invalidData, 'user')).toThrow(
        ValidationError
      );
    });

    it('should throw error for missing required fields in seller registration', () => {
      const invalidData = { ...validUserData, phone_number: '' };
      expect(() => authService.validateRegistrationData(invalidData, 'seller')).toThrow(
        ValidationError
      );
    });

    it('should throw error for invalid email format', () => {
      const invalidData = { ...validUserData, email: '' };
      expect(() => authService.validateRegistrationData(invalidData, 'user')).toThrow(
        ValidationError
      );
    });

    it('should throw error for invalid password format', () => {
      const invalidData = { ...validUserData, password: '' };
      expect(() => authService.validateRegistrationData(invalidData, 'user')).toThrow(
        ValidationError
      );
    });

    it('should throw error for invalid phone number format', () => {
      const invalidData = { ...validUserData, phone_number: '' };
      expect(() => authService.validateRegistrationData(invalidData, 'seller')).toThrow(
        ValidationError
      );
    });
  });

  describe('checkOtpRestrictions', () => {
    const mockNext = jest.fn();
    const email = 'test@example.com';

    it('should return false when no restrictions exist', async () => {
      const result = await authService.checkOtpRestrictions(email, mockNext);
      expect(result).toBe(false);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle OTP lock restriction', async () => {
      (redisClient.get as MockedRedisGet).mockResolvedValueOnce('locked');
      const result = await authService.checkOtpRestrictions(email, mockNext);
      expect(result).toBe(true);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should handle spam lock restriction', async () => {
      (redisClient.get as MockedRedisGet)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('locked');
      const result = await authService.checkOtpRestrictions(email, mockNext);
      expect(result).toBe(true);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should handle cooldown restriction', async () => {
      (redisClient.get as MockedRedisGet)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('true');
      const result = await authService.checkOtpRestrictions(email, mockNext);
      expect(result).toBe(true);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should handle Redis errors gracefully', async () => {
      (redisClient.get as MockedRedisGet).mockRejectedValueOnce(new Error('Redis error'));
      const result = await authService.checkOtpRestrictions(email, mockNext);
      expect(result).toBe(false);
    });
  });

  describe('trackOtpRequests', () => {
    const mockNext = jest.fn();
    const email = 'test@example.com';

    it('should track first OTP request successfully', async () => {
      const result = await authService.trackOtpRequests(email, mockNext);
      expect(result).toBe(false);
      expect(redisClient.set).toHaveBeenCalledWith(`otp_request_count:${email}`, '1', 'EX', 3600);
    });

    it('should handle spam lock after multiple requests', async () => {
      (redisClient.get as MockedRedisGet).mockResolvedValueOnce('2');
      const result = await authService.trackOtpRequests(email, mockNext);
      expect(result).toBe(true);
      expect(redisClient.set).toHaveBeenCalledWith(`otp_spam_lock:${email}`, 'locked', 'EX', 3600);
    });

    it('should handle Redis errors gracefully', async () => {
      (redisClient.get as MockedRedisGet).mockRejectedValueOnce(new Error('Redis error'));
      const result = await authService.trackOtpRequests(email, mockNext);
      expect(result).toBe(true);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should increment request count for existing requests', async () => {
      (redisClient.get as MockedRedisGet).mockResolvedValueOnce('1');
      const result = await authService.trackOtpRequests(email, mockNext);
      expect(result).toBe(false);
      expect(redisClient.set).toHaveBeenCalledWith(`otp_request_count:${email}`, '2', 'EX', 3600);
    });
  });

  describe('sendOtp', () => {
    const name = 'Test User';
    const email = 'test@example.com';

    it('should send OTP successfully', async () => {
      (sendEmail as MockedSendEmail).mockResolvedValue(true);
      await expect(authService.sendOtp(name, email)).resolves.not.toThrow();
      expect(sendEmail).toHaveBeenCalledWith(
        email,
        'Verify your email',
        'user-activation-mail',
        expect.any(Object)
      );
      expect(redisClient.set).toHaveBeenCalledTimes(2);
    });

    it('should throw error when email sending fails', async () => {
      (sendEmail as MockedSendEmail).mockRejectedValue(new Error('Failed to send email'));
      await expect(authService.sendOtp(name, email)).rejects.toThrow(ValidationError);
    });

    it('should handle Redis errors gracefully', async () => {
      (sendEmail as MockedSendEmail).mockResolvedValue(true);
      (redisClient.set as MockedRedisSet).mockRejectedValueOnce(new Error('Redis error'));
      await expect(authService.sendOtp(name, email)).rejects.toThrow(ValidationError);
    });

    it('should generate and store OTP correctly', async () => {
      (sendEmail as MockedSendEmail).mockResolvedValue(true);
      await authService.sendOtp(name, email);
      expect(redisClient.set).toHaveBeenCalledWith(
        `otp:${email}`,
        expect.stringMatching(/^\d{4}$/),
        'EX',
        300
      );
    });
  });

  describe('verifyOtp', () => {
    const email = 'test@example.com';
    const otp = '1234';

    it('should verify OTP successfully', async () => {
      (redisClient.get as MockedRedisGet).mockResolvedValue(otp);
      await expect(authService.verifyOtp(email, otp)).resolves.not.toThrow();
      expect(redisClient.del).toHaveBeenCalledWith(`otp:${email}`);
    });

    it('should throw error for invalid OTP', async () => {
      (redisClient.get as MockedRedisGet).mockResolvedValue('5678');
      await expect(authService.verifyOtp(email, otp)).rejects.toThrow(ValidationError);
    });

    it('should handle failed attempts and lock account', async () => {
      (redisClient.get as MockedRedisGet)
        .mockResolvedValueOnce('5678') // First attempt
        .mockResolvedValueOnce('2') // Failed attempts count
        .mockResolvedValueOnce('5678') // Second attempt
        .mockResolvedValueOnce('2'); // Failed attempts count

      await expect(authService.verifyOtp(email, otp)).rejects.toThrow(ValidationError);
      expect(redisClient.set).toHaveBeenCalledWith(`otp_lock:${email}`, 'locked', 'EX', 1800);
    });

    it('should handle Redis errors gracefully', async () => {
      (redisClient.get as MockedRedisGet).mockRejectedValue(new Error('Redis error'));
      await expect(authService.verifyOtp(email, otp)).rejects.toThrow(ValidationError);
    });

    it('should increment failed attempts counter', async () => {
      (redisClient.get as MockedRedisGet)
        .mockResolvedValueOnce('5678') // Invalid OTP
        .mockResolvedValueOnce('1'); // Current failed attempts

      await expect(authService.verifyOtp(email, otp)).rejects.toThrow(ValidationError);
      expect(redisClient.set).toHaveBeenCalledWith(`otp_failed_attempts:${email}`, '2', 'EX', 300);
    });
  });

  describe('handleForgotPassword', () => {
    const mockReq = {
      body: { email: 'test@example.com' },
    } as any;
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;
    const mockNext = jest.fn();

    beforeEach(() => {
      const mockUser: User = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      jest.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    });

    it('should handle forgot password successfully', async () => {
      (redisClient.get as MockedRedisGet).mockResolvedValue(null);
      (sendEmail as MockedSendEmail).mockResolvedValue(true);
      await authService.handleForgotPassword(mockReq, mockRes, mockNext, 'user');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'OTP sent to email, please verify your account',
      });
    });

    it('should handle non-existent user', async () => {
      jest.mocked(prisma.user.findUnique).mockResolvedValue(null);
      await authService.handleForgotPassword(mockReq, mockRes, mockNext, 'user');
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should handle missing email', async () => {
      const req = { body: {} } as any;
      await authService.handleForgotPassword(req, mockRes, mockNext, 'user');
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should handle email sending failure', async () => {
      (redisClient.get as MockedRedisGet).mockResolvedValue(null);
      (sendEmail as MockedSendEmail).mockRejectedValue(new Error('Failed to send email'));
      await authService.handleForgotPassword(mockReq, mockRes, mockNext, 'user');
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should handle Redis errors gracefully', async () => {
      (redisClient.get as MockedRedisGet).mockRejectedValue(new Error('Redis error'));
      await authService.handleForgotPassword(mockReq, mockRes, mockNext, 'user');
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('verifyForgotPasswordOtp', () => {
    const mockReq = {
      body: { email: 'test@example.com', otp: '1234' },
    } as any;
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;
    const mockNext = jest.fn();

    it('should verify forgot password OTP successfully', async () => {
      (redisClient.get as MockedRedisGet).mockResolvedValue('1234');
      await authService.verifyForgotPasswordOtp(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'OTP verified, You can now reset your password',
        success: true,
      });
    });

    it('should handle missing email or OTP', async () => {
      const req = { body: {} } as any;
      await authService.verifyForgotPasswordOtp(req, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should handle invalid OTP', async () => {
      (redisClient.get as MockedRedisGet).mockResolvedValue('5678');
      await authService.verifyForgotPasswordOtp(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should handle Redis errors gracefully', async () => {
      (redisClient.get as MockedRedisGet).mockRejectedValue(new Error('Redis error'));
      await authService.verifyForgotPasswordOtp(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should delete OTP after successful verification', async () => {
      (redisClient.get as MockedRedisGet).mockResolvedValue('1234');
      await authService.verifyForgotPasswordOtp(mockReq, mockRes, mockNext);
      expect(redisClient.del).toHaveBeenCalledWith(`otp:${mockReq.body.email}`);
    });
  });
});
