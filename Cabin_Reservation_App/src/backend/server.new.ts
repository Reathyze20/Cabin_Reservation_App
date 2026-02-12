import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import { PORT, UPLOADS_PATH } from "../config/config";
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
const isProd = process.env.NODE_ENV === "production";

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

// Trust proxy (for Docker / reverse proxy — correct IP in rate limiter & logs)
app.set("trust proxy", 1);

// CORS — in production allow same origin, in dev allow all
if (isProd) {
  app.use(cors({
    origin: true, // Reflect the request origin (allows same-origin)
    credentials: true, // Allow credentials (cookies, authorization headers)
  }));
} else {
  app.use(cors());
}

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
const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../../dist/frontend");
const uploadsPath = UPLOADS_PATH;

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Uploads are served by both dev and prod
app.use("/uploads", express.static(uploadsPath, {
  maxAge: "7d",
  etag: true,
  immutable: true, // Upload filenames contain UUIDs — never change
}));

// In production, serve Vite-built static assets from dist/frontend
// In dev, Vite dev server handles frontend (proxied via vite.config.ts)
if (isProd) {
  app.use(express.static(distPath, {
    maxAge: "1d",
    etag: true,
    lastModified: true,
  }));
}

// ============================================================================
//                                ROUTES
// ============================================================================

// Health check (with real DB ping)
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (err) {
    logger.error("HEALTH", "Database health check failed", err);
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      database: "disconnected",
    });
  }
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

// In production, serve index.html for all non-API routes (SPA routing)
if (isProd) {
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// ============================================================================
//                          ERROR HANDLING
// ============================================================================

process.on("SIGINT", async () => {
  logger.info("SERVER", "Gracefully shutting down (SIGINT)...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("SERVER", "Gracefully shutting down (SIGTERM)...");
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
