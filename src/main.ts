import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";

import { errorMiddleware } from "./middleware/error-middleware";
import router from "./routes/auth.routes";

const app = express();

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["set-cookie"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

// Body parsers
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(cookieParser());

// Health check
app.get("/api/v1/health", (_req, res) => {
  res.json({ message: "Auth service is healthy!" });
});

// Mount auth routes under /api/v1
app.use("/", router);

// Global error handler
app.use(errorMiddleware);

const PORT = parseInt(process.env.PORT || "8000", 10);
const SERVER = app.listen(PORT, () => {
  console.log(`Auth service running at http://localhost:${PORT}/api/v1/health`);
});

SERVER.on("error", (err: NodeJS.ErrnoException) => {
  console.error("Auth service error:", err);
  if (err.code === "EADDRINUSE") {
    console.log(`Port ${PORT} busy, retrying...`);
    setTimeout(() => {
      SERVER.close();
      SERVER.listen(PORT);
    }, 1000);
  }
});
