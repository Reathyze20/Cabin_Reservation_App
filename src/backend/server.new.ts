import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import { PORT } from "../config/config";
import prisma from "../utils/prisma";
import logger from "../utils/logger";

// Import routes
import authRoutes from "./routes/auth";
import logsRoutes from "./routes/logs";
import usersRoutes from "./routes/users";
import reservationsRoutes from "./routes/reservations";
import shoppingListRoutes from "./routes/shoppingList";
import notesRoutes from "./routes/notes";
import galleryRoutes from "./routes/gallery";
import diaryRoutes from "./routes/diary";
import reconstructionRoutes from "./routes/reconstruction";

const app = express();

// ============================================================================
//                              MIDDLEWARE
// ============================================================================

// Gzip/Brotli compression
app.use(compression());

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable for now (can be configured later)
    crossOriginEmbedderPolicy: false,
  })
);

// Rate limiting for auth endpoints only
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login/register requests per windowMs
  message: "Příliš mnoho pokusů o přihlášení. Zkuste to prosím později.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Body parser (10mb for photo uploads via multer, reduced from 50mb)
app.use(express.json({ limit: "10mb" }));

// CORS
app.use(cors());

// Request logging
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
      logger[level]("HTTP", `${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`, {
        ip: req.ip,
        user: req.user?.username || "anonymous",
      });
    });
  }
  next();
});

// Static files
const frontendPath = path.join(__dirname, "../../src/frontend");
const uploadsPath = path.join(__dirname, "../../data/uploads");

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

app.use(express.static(frontendPath, {
  maxAge: "1d",
  etag: true,
  lastModified: true,
}));
app.use("/uploads", express.static(uploadsPath, {
  maxAge: "7d",
  etag: true,
  immutable: true, // Upload filenames contain UUIDs — never change
}));

// ============================================================================
//                                ROUTES
// ============================================================================

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: "connected",
  });
});

// Auth routes (rate limiter only on login/register)
app.use("/api/login", authLimiter);
app.use("/api/register", authLimiter);
app.use("/api", authRoutes);

// API routes
app.use("/api/users", usersRoutes);
app.use("/api/reservations", reservationsRoutes);
app.use("/api/shopping-list", shoppingListRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/diary", diaryRoutes);
app.use("/api/reconstruction", reconstructionRoutes);
app.use("/api/logs", logsRoutes);

// ============================================================================
//                            SPA FALLBACK
// ============================================================================

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../src/frontend/index.html"));
});

// ============================================================================
//                          ERROR HANDLING
// ============================================================================

process.on("SIGINT", async () => {
  console.log("\nGracefully shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nGracefully shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

// ============================================================================
//                            START SERVER
// ============================================================================

app.listen(PORT, () => {
  logger.info("SERVER", `🚀 Backend server naslouchá na http://localhost:${PORT}`);
  logger.info("SERVER", `📊 Health check: http://localhost:${PORT}/api/health`);
});
