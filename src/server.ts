// apps/auth-service/src/main.ts
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import router from './routes/auth.routes';
import { errorMiddleware } from './middleware/error-middleware';
import { cacheMiddleware } from './middleware/cache-middleware';
import logger from './utils/logger';
import fs from 'fs/promises';
import csurf from 'csurf';

const app = express();

// Security middleware
app.use(helmet());
app.use(csurf());

// Compression middleware
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['set-cookie'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

// Body parsers
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());

// Health check with caching
app.get('/api/v1/health', cacheMiddleware(60), (_req, res) => {
  logger.info('Health check endpoint called');
  res.json({ message: 'Auth service is healthy!' });
});

// Mount auth routes under /api/v1 with caching for GET requests
app.use('/', cacheMiddleware(), router);

// Optional: API docs via Scalar
async function setupApiReference() {
  // فقط در محیط development مستندات را نمایش بده
  if (process.env.NODE_ENV === 'production') {
    logger.info('API Reference disabled in production');
    return;
  }

  try {
    const { apiReference } = await import('@scalar/express-api-reference');
    const scalarContent = await fs.readFile('./src/scalar-output.json', 'utf-8');
    const scalarDocument = JSON.parse(scalarContent);

    // اضافه کردن basePath به document
    scalarDocument.basePath = '/api/v1';

    app.use(
      '/api/v1/docs',
      apiReference({
        content: scalarDocument,
        theme: 'purple',
      })
    );
    logger.info(
      `API Reference available at http://localhost:${process.env.PORT || 8000}/api/v1/docs`
    );
  } catch (err) {
    logger.error('No API Reference configured:', err);
  }
}
setupApiReference();

// Global error handler
app.use(errorMiddleware as unknown as express.ErrorRequestHandler);

const PORT = parseInt(process.env.PORT || '8000', 10);
const SERVER = app.listen(PORT, () => {
  logger.info(`Auth service running at http://localhost:${PORT}/api/v1/health`);
});

SERVER.on('error', (err: NodeJS.ErrnoException) => {
  logger.error('Auth service error:', err);
  if (err.code === 'EADDRINUSE') {
    logger.warn(`Port ${PORT} busy, retrying...`);
    setTimeout(() => {
      SERVER.close();
      SERVER.listen(PORT);
    }, 1000);
  }
});
