import { Request, Response, NextFunction } from "express";
import { AppError, ValidationError, AuthError, ForbiddenError, DatabaseError, RateLimitError } from "./error-handler";

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({
    success: false,
    message: "Internal server error",
    details: err.message,
  });
};
