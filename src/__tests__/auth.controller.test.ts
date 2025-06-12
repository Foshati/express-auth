import request from 'supertest';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { prisma } from '../libs/prisma';
import { hash } from 'bcryptjs';
import router from '../routes/auth.routes';
import { errorMiddleware } from '../middleware/error-middleware';
import { jest } from '@jest/globals';
import { sendEmail } from '../utils/sendMail';

// Mock dependencies
jest.mock('../utils/sendMail', () => ({
  sendEmail: jest.fn().mockImplementation(() => Promise.resolve(true)),
}));

jest.mock('../libs/redis', () => ({
  redisClient: {
    get: jest.fn().mockImplementation(() => Promise.resolve(null)),
    set: jest.fn().mockImplementation(() => Promise.resolve('OK')),
    del: jest.fn().mockImplementation(() => Promise.resolve(1)),
  },
}));

const app = express();

// Setup middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use('/', router);
app.use(errorMiddleware);

describe('Auth Controller', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany();
  }, 10000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (sendEmail as jest.MockedFunction<typeof sendEmail>).mockResolvedValue(true);
  });

  describe('POST /api/v1/auth/register', () => {
    it('should send OTP for registration', async () => {
      const userData = {
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!@#',
      };

      const response = await request(app).post('/api/v1/auth/register').send(userData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        'message',
        'OTP sent to your email, Please verify your account'
      );
      expect(sendEmail).toHaveBeenCalled();
    });

    it('should not send OTP for existing email', async () => {
      // Create a user first
      const hashedPassword = await hash('Test123!@#', 10);
      await prisma.user.create({
        data: {
          name: 'Existing User',
          username: 'existinguser',
          email: 'test@example.com',
          password: hashedPassword,
        },
      });

      const userData = {
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!@#',
      };

      const response = await request(app).post('/api/v1/auth/register').send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        'message',
        'Email is already registered. Please use a different email.'
      );
    });
  });
});
