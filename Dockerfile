# استفاده از Node.js 22
FROM node:22-alpine

# ایجاد دایرکتوری کار
WORKDIR /app

# کپی package.json و package-lock.json
COPY package*.json ./

# نصب وابستگی‌ها
RUN npm install

# کپی بقیه فایل‌های پروژه
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# ساخت پروژه
RUN npm run build

# پورت مورد استفاده
EXPOSE 8000

# دستور اجرای برنامه
CMD ["npm", "run", "dev"]