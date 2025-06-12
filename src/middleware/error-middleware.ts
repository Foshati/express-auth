import { Request, Response, NextFunction } from 'express';
import { AppError } from './error-handler';

export const errorMiddleware = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    console.log(`Error ${req.method} ${req.url} : ${err.message}`);
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(typeof err.details === 'object' && err.details !== null ? { details: err.details } : {}),
    });
  }

  console.log('Unhandled error', err);
  return res.status(500).json({
    error: 'Internal server error',
  });
};

// For handling async errors
export const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};
