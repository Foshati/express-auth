# Auth Service

سرویس احراز هویت با Node.js و TypeScript

## ویژگی‌ها

- احراز هویت با JWT
- مدیریت کاربران
- API مستند شده با Scalar
- سیستم Cache
- Compression برای بهبود عملکرد
- Rate Limiting برای امنیت
- Docker support
- تست‌های خودکار

## پیش‌نیازها

- Node.js 18 یا بالاتر
- npm یا yarn
- Docker (اختیاری)

## نصب و راه‌اندازی

1. نصب وابستگی‌ها:
```bash
npm install
```

2. تنظیم متغیرهای محیطی:
```bash
cp .env.example .env
```

3. اجرای در حالت توسعه:
```bash
npm run dev
```

4. اجرا با Docker:
```bash
docker-compose up
```

## تست‌ها

```bash
# اجرای همه تست‌ها
npm test

# اجرای تست‌ها با coverage
npm run test:coverage
```

## API Documentation

مستندات API در آدرس زیر در دسترس است:
```
http://localhost:8000/api/v1/docs
```

## ساختار پروژه

```
src/
  ├── controllers/    # کنترلرهای API
  ├── middleware/     # middleware‌ها
  ├── routes/         # مسیرهای API
  ├── services/       # سرویس‌های کسب و کار
  ├── utils/          # توابع کمکی
  ├── types/          # تعاریف TypeScript
  └── server.ts       # نقطه ورود برنامه
```

## مشارکت

1. Fork کنید
2. Branch جدید ایجاد کنید (`git checkout -b feature/amazing-feature`)
3. تغییرات را commit کنید (`git commit -m 'Add some amazing feature'`)
4. به Branch خود push کنید (`git push origin feature/amazing-feature`)
5. Pull Request ایجاد کنید

## لایسنس

MIT 