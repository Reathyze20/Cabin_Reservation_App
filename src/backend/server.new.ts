import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import cron from "node-cron";
import { PORT, UPLOADS_PATH } from "../config/config";
import prisma from "../utils/prisma";
import logger from "../utils/logger";
import { requestContext } from "../utils/asyncContext";
import { httpLogger } from "../middleware/httpLogger";
import { checkFrostAlerts } from "./jobs/weatherAlerts";
import { initSocketServer } from "../utils/socket";

// Import routes
import authRoutes from "./routes/auth";
import logsRoutes from "./routes/logs";
import usersRoutes from "./routes/users";
import reservationsRoutes from "./routes/reservations";
import shoppingListRoutes from "./routes/shoppingList";
import notesRoutes from "./routes/notes";
import channelsRoutes from "./routes/channels";
import messagesRoutes from "./routes/messages";
import galleryRoutes from "./routes/gallery";
import diaryRoutes from "./routes/diary";
import reconstructionRoutes from "./routes/reconstruction";
import dashboardRoutes from "./routes/dashboard";
// noteThreadsRoutes kept for backward-compat; superseded by channelsRoutes
import noteThreadsRoutes from "./routes/noteThreads";
import shoppingListsRoutes from "./routes/shoppingLists";
import adminRoutes from "./routes/admin";
import inventoryRoutes from "./routes/inventory";
import workspaceRoutes from "./routes/workspace";
import invitesRoutes from "./routes/invites";
import cabinRoutes from "./routes/cabin";
import wallpapersRoutes from "./routes/wallpapers";

const app = express();
const server = http.createServer(app);
const isProd = process.env.NODE_ENV === "production";

// Initialize Socket.io
initSocketServer(server);

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
  max: 30, // Limit each IP to 30 login/register requests per windowMs
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

// Request ID & Context middleware
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id']?.toString() || uuidv4().split('-')[0];
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Override res.json to automatically inject errorId on 500 errors
  const originalJson = res.json;
  res.json = function (body) {
    if (res.statusCode >= 500 && typeof body === 'object' && body !== null) {
      body.errorId = requestId;
    }
    return originalJson.call(this, body);
  };

  requestContext.run({ requestId, userId: (req as any).user?.id }, () => {
    next();
  });
});

// Strukturované HTTP request/response logování (httpLogger nahrazuje starý inline blok)
app.use(httpLogger);

// Static files
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
    setHeaders(res, filePath) {
      // index.html must never be cached — SPA shell references hashed bundles
      if (filePath.endsWith("index.html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      }
    },
  }));
}

// ============================================================================
//                                ROUTES
// ============================================================================

// Health check (with real DB ping)
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (err) {
    logger.prismaError("Database health check failed", err);
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
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/workspace", workspaceRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/reservations", reservationsRoutes);
app.use("/api/shopping-lists", shoppingListsRoutes);
app.use("/api/shopping-list", shoppingListRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/note-threads", noteThreadsRoutes);
app.use("/api/channels", channelsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/diary", diaryRoutes);
app.use("/api/reconstruction", reconstructionRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/cabin", cabinRoutes);
app.use("/api/wallpapers", wallpapersRoutes);
app.use("/api/invites/accept", authLimiter); // Rate limit invite accept (public)
app.use("/api/invites", invitesRoutes);

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
  logger.info("Gracefully shutting down (SIGINT)...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Gracefully shutting down (SIGTERM)...");
  await prisma.$disconnect();
  process.exit(0);
});

// ============================================================================
//                            START SERVER
// ============================================================================

server.listen(PORT, () => {
  logger.info(`Backend server naslouchá na http://localhost:${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/api/health`);

  // ── Cron Jobs ──────────────────────────────────────────────────────────
  // Frost alert check — every day at 12:00 (noon)
  cron.schedule("0 12 * * *", () => {
    logger.info("CRON", "Running scheduled frost alert check");
    checkFrostAlerts();
  });
  logger.info("CRON", "Frost alert cron scheduled (daily at 12:00)");
});
