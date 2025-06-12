/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Base Error Class
export class AppError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific Error Classes
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 401, details);
    this.name = 'AuthError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 401, details);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 403, details);
    this.name = 'AuthorizationError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 403, details);
    this.name = 'ForbiddenError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, details);
    this.name = 'DatabaseError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 429, details);
    this.name = 'RateLimitError';
  }
}

// Validation Middleware using Zod
export const validate = (schema: z.ZodSchema<any>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        next(new ValidationError('Validation failed', errorMessages));
      } else {
        next(new ValidationError('Invalid request data'));
      }
    }
  };
};

export const errorHandler = (error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);

  if (error instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      message: error.message,
      error: 'Validation Error',
      details: error.details,
    });
  }

  if (error instanceof AuthError || error instanceof AuthenticationError) {
    return res.status(401).json({
      success: false,
      message: error.message,
      error: 'Authentication Error',
    });
  }

  if (error instanceof AuthorizationError || error instanceof ForbiddenError) {
    return res.status(403).json({
      success: false,
      message: error.message,
      error: 'Authorization Error',
    });
  }

  if (error instanceof RateLimitError) {
    return res.status(429).json({
      success: false,
      message: error.message,
      error: 'Rate Limit Error',
    });
  }

  if (error instanceof DatabaseError) {
    return res.status(500).json({
      success: false,
      message: error.message,
      error: 'Database Error',
    });
  }

  // Default error
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
  });
};
