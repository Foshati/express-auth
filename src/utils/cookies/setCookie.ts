import { CookieOptions, Response } from 'express';

export const setCookie = (res: Response, name: string, value: string, options?: CookieOptions) => {
  const defaultOptions: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  res.cookie(name, value, { ...defaultOptions, ...options });
};
