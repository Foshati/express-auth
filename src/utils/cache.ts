import NodeCache from 'node-cache';

// تنظیمات پیش‌فرض برای cache
const cacheConfig = {
  stdTTL: 600, // زمان زندگی پیش‌فرض: 10 دقیقه
  checkperiod: 120, // بررسی هر 2 دقیقه برای حذف آیتم‌های منقضی شده
  useClones: false, // برای عملکرد بهتر
};

// ایجاد یک نمونه از cache
const cache = new NodeCache(cacheConfig);

// تابع کمکی برای ذخیره داده در cache
export const setCache = (key: string, value: any, ttl: number = cacheConfig.stdTTL): boolean => {
  return cache.set(key, value, ttl);
};

// تابع کمکی برای دریافت داده از cache
export const getCache = (key: string): any => {
  return cache.get(key);
};

// تابع کمکی برای حذف داده از cache
export const deleteCache = (key: string): number => {
  return cache.del(key);
};

// تابع کمکی برای پاک کردن کل cache
export const clearCache = (): void => {
  cache.flushAll();
};

// تابع کمکی برای بررسی وجود کلید در cache
export const hasCache = (key: string): boolean => {
  return cache.has(key);
};

export default cache;
