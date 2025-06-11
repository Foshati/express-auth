import { Request, Response, NextFunction } from 'express';

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class AuthenticationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthenticationError';
    }
}

export class AuthorizationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthorizationError';
    }
}

export const errorHandler = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);

    if (error instanceof ValidationError) {
        return res.status(400).json({
            success: false,
            message: error.message,
            error: 'Validation Error'
        });
    }

    if (error instanceof AuthenticationError) {
        return res.status(401).json({
            success: false,
            message: error.message,
            error: 'Authentication Error'
        });
    }

    if (error instanceof AuthorizationError) {
        return res.status(403).json({
            success: false,
            message: error.message,
            error: 'Authorization Error'
        });
    }

    // Default error
    return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
};