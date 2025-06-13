import { NextFunction, Request, Response } from 'express';
import {
  checkOtpRestrictions,
  sendOtp,
  trackOtpRequests,
  verifyForgotPasswordOtp,
  verifyOtp,
} from '../services/auth.service';

import bcrypt from 'bcryptjs';
import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import { setCookie } from '../utils/cookies/setCookie';
import { ValidationError, AuthError } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../libs/prisma';

//Register a new user
export const userRegistration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, username, password } = req.body;
    // Zod validation is handled by middleware, so we can assume req.body is valid here

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      // Return specific error for duplicate email
      res.status(400).json({
        success: false,
        message: 'Email is already registered. Please use a different email.',
      });
      return;
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      // Return specific error for duplicate username
      res.status(400).json({
        success: false,
        message: 'Username is already taken. Please choose another one.',
      });
      return;
    }
    if (typeof password !== 'string' || password.length < 8) {
      res.status(400).json({
        message: 'Password must be a string and at least 8 characters long.',
      });
      return;
    }

    if (!name || !email || !username || !password) {
      res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
      return;
    }

    const restrictionError = await checkOtpRestrictions(email, next);
    if (restrictionError) return;

    const trackError = await trackOtpRequests(email, next);
    if (trackError) return;

    await sendOtp(name, email, 'user-activation-mail');

    res.status(200).json({
      message: 'OTP sent to your email, Please verify your account',
    });
  } catch (error) {
    next(error);
  }
};

//Verify user with OTP
export const userVerify = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp, password, name, username } = req.body;
    // Zod validation is handled by middleware

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new ValidationError('User is already registered with this email. Please login.');
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      throw new ValidationError('Username is already taken. Please choose another one.');
    }

    await verifyOtp(email, otp);

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { name, email, username, password: hashedPassword },
    });
    res.status(201).json({ message: 'User registered successfully', success: true });
  } catch (error) {
    next(error);
  }
};

//Login user
export const userLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    // Zod validation is handled by middleware

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      next(new AuthError("User doesn't exist"));
      return;
    }
    //verify password
    if (!user.password) {
      next(new AuthError('Invalid credentials'));
      return;
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      next(new AuthError('Invalid email or password'));
      return;
    }

    // Generate access token and refresh token
    const accessToken = jwt.sign(
      { id: user.id, role: 'user' },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: '1d' } // Expires in 1 day
    );
    const refreshToken = jwt.sign(
      { id: user.id, role: 'user' },
      process.env.REFRESH_TOKEN_SECRET as string,
      { expiresIn: '30d' } // Expires in 30 days
    );
    // store the refresh token and access token in a http-only secure cookie
    // Access token cookie expires in 1 day
    setCookie(res, 'access_token', accessToken, { maxAge: 24 * 60 * 60 * 1000 }); // 1 day in milliseconds
    // Refresh token cookie expires in 30 days
    setCookie(res, 'refresh_token', refreshToken, { maxAge: 30 * 24 * 60 * 60 * 1000 }); // 30 days in milliseconds

    res.status(200).json({
      message: 'Login successful',
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
      },
    });
  } catch (error) {
    next(error);
  }
};

// refresh token user
export const userRefreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
      next(new ValidationError('Unauthorized No refresh token provided'));
      return;
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string) as {
      id: string;
      role: string;
    };
    if (!decoded || !decoded.id || !decoded.role) {
      next(new JsonWebTokenError('Forbidden Invalid refresh token'));
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      next(new AuthError('Forbidden User not Found'));
      return;
    }

    const newAccessToken = jwt.sign(
      { id: decoded.id, role: decoded.role },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: '1d' } // Expires in 1 day
    );

    // Access token cookie expires in 1 day
    setCookie(res, 'access_token', newAccessToken, { maxAge: 24 * 60 * 60 * 1000 }); // 1 day in milliseconds

    res.status(201).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

// get logged in user
export const getUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

// user forget password
export const userForgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    // Zod validation is handled by middleware

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      next(new ValidationError('No user found with this email'));
      return;
    }

    const restrictionError = await checkOtpRestrictions(email, next);
    if (restrictionError) return;

    const trackError = await trackOtpRequests(email, next);
    if (trackError) return;

    await sendOtp(user.name, email, 'forgot-password-user-mail');

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email for password reset',
    });
  } catch (error) {
    next(error);
  }
};

// user verify forgot password
export const userVerifyForgotPasswordOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await verifyForgotPasswordOtp(req, res, next);
  } catch (error) {
    next(error);
  }
};

//reset user password
export const userResetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, newPassword } = req.body;
    // Zod validation is handled by middleware

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      next(new ValidationError('User not found'));
      return;
    }
    if (!user.password) {
      next(new ValidationError('User has no password set'));
      return;
    }
    // compare new password with the old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      next(new ValidationError('New password cannot be the same as the old password'));
      return;
    }
    // hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { email }, data: { password: hashedPassword } });

    res.status(200).json({ message: 'Password reset successfully', success: true });
  } catch (error) {
    next(error);
  }
};

// resend otp
export const resendOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, name } = req.body;
    // Zod validation is handled by middleware

    const restrictionError = await checkOtpRestrictions(email, next);
    if (restrictionError) return;

    const trackError = await trackOtpRequests(email, next);
    if (trackError) return;

    const Name = name || 'Dear user';
    await sendOtp(Name, email, 'user-activation-mail');

    res.status(200).json({
      success: true,
      message: 'OTP has been resent to your email',
    });
  } catch (error) {
    next(error);
  }
};

// Field validation endpoint
export const validateField = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { field, value } = req.body;
    // Zod validation is handled by middleware

    if (field === 'email') {
      const existingEmail = await prisma.user.findUnique({
        where: { email: value },
      });

      res.status(200).json({
        valid: !existingEmail,
        message: existingEmail ? 'Email is already registered' : 'Email is available',
      });
      return;
    } else if (field === 'username') {
      const existingUsername = await prisma.user.findUnique({
        where: { username: value },
      });

      res.status(200).json({
        valid: !existingUsername,
        message: existingUsername ? 'Username is already taken' : 'Username is available',
      });
      return;
    } else {
      next(new ValidationError('Invalid field type'));
      return;
    }
  } catch (error) {
    next(error);
  }
};

// Logout user
export const userLogout = (req: Request, res: Response) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};
