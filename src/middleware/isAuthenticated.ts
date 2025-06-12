import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../libs/prisma';
import { AuthenticatedRequest } from '../types';

export const isAuthenticated = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from cookie or Authorization header
    const token = req.cookies.access_token || req.headers.authorization?.split(' ')[1];

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized Token missing',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as {
      id: string;
      role?: 'user' | 'seller';
    };

    // Validate decoded token structure
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      });
    }

    // Validate that user exists in database
    const account = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!account) {
      return res.status(401).json({
        success: false,
        message: 'Account not found',
      });
    }

    req.user = account;
    return next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token',
    });
  }
};
