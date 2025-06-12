import Redis from 'ioredis';

if (!process.env.REDIS_DATABASE_URI) {
  console.error('Missing Redis configuration. Please set REDIS_DATABASE_URI in your .env file.');
  throw new Error('Redis configuration is missing');
}

export const redisClient = new Redis(process.env.REDIS_DATABASE_URI);
