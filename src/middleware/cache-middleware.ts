import { Request, Response, NextFunction } from 'express';
import { getCache, setCache } from '../utils/cache';

// زمان پیش‌فرض برای cache (5 دقیقه)
const DEFAULT_CACHE_TTL = 300;

export const cacheMiddleware = (ttl: number = DEFAULT_CACHE_TTL) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // فقط درخواست‌های GET را cache می‌کنیم
    if (req.method !== 'GET') {
      return next();
    }

    // ایجاد کلید یکتا برای cache
    const key = `__express__${req.originalUrl || req.url}`;

    // بررسی وجود داده در cache
    const cachedResponse = getCache(key);
    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    // ذخیره پاسخ اصلی
    const originalJson = res.json;
    res.json = function (body: any) {
      // ذخیره پاسخ در cache
      setCache(key, body, ttl);
      return originalJson.call(this, body);
    };

    next();
  };
};
