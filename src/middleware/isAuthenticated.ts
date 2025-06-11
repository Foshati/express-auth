import { Response, NextFunction } from "express";
import jwt from 'jsonwebtoken';
import { prisma } from "libs/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isAuthenticated = async (req: any, res: Response, next: NextFunction) => {
    try {
        // Get token from cookie or Authorization header
        const token = req.cookies.access_token || req.headers.authorization?.split(" ")[1];

        // Check if token exists
        if (!token) {
            return res.status(401).json({
                message: "Unauthorized Token missing"
            });
        }

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET as string
        ) as {
            id: string;
            role: "user" | "seller";
        }

        // Validate decoded token structure
        if (!decoded) {
            return res.status(401).json({
                message: "Invalid authentication token"
            });
        }

        // Validate that user exists in database
        const account = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!account) {
            return res.status(401).json({
                message: "Account not found"
            });
        }

        req.user = account;
        return next();
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};
