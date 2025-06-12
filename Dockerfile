# استفاده از Node.js LTS
FROM node:18-alpine

# ایجاد دایرکتوری کار
WORKDIR /app

# کپی package.json و package-lock.json
COPY package*.json ./

# نصب وابستگی‌ها
RUN npm ci

# کپی بقیه فایل‌های پروژه
COPY . .

# ساخت پروژه
RUN npm run build

# پورت مورد استفاده
EXPOSE 8000

# دستور اجرای برنامه
CMD ["npm", "start"] 