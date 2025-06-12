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
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger-ui/swagger-output.json';
import csurf from 'csurf';
import session from 'express-session';
import fs from 'fs';
import path from 'path';

const app = express();

// Security middleware
app.use(helmet());

// Body parsers
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'supersecret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' },
  })
);

// CSRF middleware
app.use(csurf({ cookie: true }));

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

// Health check with caching
app.get('/api/v1/health', cacheMiddleware(60), (_req, res) => {
  logger.info('Health check endpoint called');
  res.json({ message: 'Auth service is healthy!' });
});

// Mount auth routes under /api/v1 with caching for GET requests
app.use('/', cacheMiddleware(), router);

// Swagger docs - only in development
if (process.env.NODE_ENV !== 'production') {
  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customCss: fs.readFileSync(path.join(__dirname, 'swagger-ui/SwaggerDark.css'), 'utf8'),
      customSiteTitle: 'Auth Service API Documentation',
    })
  );
  app.use('/docs.json', (_req, res) => res.json(swaggerDocument));
}

// Global error handler
app.use(errorMiddleware as unknown as express.ErrorRequestHandler);

const PORT = parseInt(process.env.PORT || '8000', 10);
const SERVER = app.listen(PORT, () => {
  logger.info(`Auth service running at http://localhost:${PORT}/api/v1/health`);
  console.log(`Swagger UI is running at http://localhost:${PORT}/docs`);
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
