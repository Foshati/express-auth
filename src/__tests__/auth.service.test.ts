import * as authService from '../services/auth.service';
import { prisma } from '../libs/prisma';
import { ValidationError } from '../middleware/error-handler';
import { sendEmail } from '../utils/sendMail';
import { redisClient } from '../libs/redis';
import { jest } from '@jest/globals';

type MockedSendEmail = jest.MockedFunction<typeof sendEmail>;
type MockedRedisGet = jest.MockedFunction<typeof redisClient.get>;

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
  beforeEach(async () => {
    jest.clearAllMocks();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('validateRegistrationData', () => {
    it('should validate registration data successfully', () => {
      const userData = {
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!@#',
        phone_number: '1234567890',
        country: 'Iran',
      };

      expect(() => authService.validateRegistrationData(userData, 'user')).not.toThrow();
    });

    it('should throw error for missing required fields', () => {
      const userData = {
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: '',
      };

      expect(() => authService.validateRegistrationData(userData, 'user')).toThrow(ValidationError);
    });
  });

  describe('sendOtp', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should send OTP successfully', async () => {
      const name = 'Test User';
      const email = 'test@example.com';

      // Mock sendEmail to always succeed
      (sendEmail as MockedSendEmail).mockResolvedValue(true);

      await expect(authService.sendOtp(name, email)).resolves.not.toThrow();
      expect(sendEmail).toHaveBeenCalledWith(
        email,
        'Verify your email',
        'user-activation-mail',
        expect.any(Object)
      );
    });

    it('should throw error when email sending fails', async () => {
      const name = 'Test User';
      const email = 'test@example.com';

      // Mock sendEmail to fail
      (sendEmail as MockedSendEmail).mockRejectedValue(new Error('Failed to send email'));

      await expect(authService.sendOtp(name, email)).rejects.toThrow(ValidationError);
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP successfully', async () => {
      const email = 'test@example.com';
      const otp = '1234';

      (redisClient.get as MockedRedisGet).mockResolvedValue(otp);

      await expect(authService.verifyOtp(email, otp)).resolves.not.toThrow();
      expect(redisClient.del).toHaveBeenCalledWith(`otp:${email}`);
    });

    it('should throw error for invalid OTP', async () => {
      const email = 'test@example.com';
      const otp = '1234';

      (redisClient.get as MockedRedisGet).mockResolvedValue('5678');

      await expect(authService.verifyOtp(email, otp)).rejects.toThrow(ValidationError);
    });

    it('should handle failed attempts', async () => {
      const email = 'test@example.com';
      const otp = '1234';

      (redisClient.get as MockedRedisGet)
        .mockResolvedValueOnce('5678') // First attempt
        .mockResolvedValueOnce('1') // Failed attempts count
        .mockResolvedValueOnce('5678') // Second attempt
        .mockResolvedValueOnce('2'); // Failed attempts count

      await expect(authService.verifyOtp(email, otp)).rejects.toThrow(ValidationError);
      expect(redisClient.set).toHaveBeenCalledWith(`otp_failed_attempts:${email}`, '2', 'EX', 300);
    });
  });
});
