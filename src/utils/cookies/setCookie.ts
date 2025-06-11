import { Response } from "express";

export const setCookie = (res: Response, name: string, value: string) => {
    const isProduction = process.env.NODE_ENV === "production";

    res.cookie(name, value, {
        httpOnly: true,
        secure: isProduction, // Use HTTPS only in production
        sameSite: isProduction ? "none" : "lax", // lax works better in development
        maxAge: 60 * 60 * 24 * 7, // 7 days
    });
}
