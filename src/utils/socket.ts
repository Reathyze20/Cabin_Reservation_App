/**
 * utils/socket.ts — Socket.io server initialization
 * JWT-authenticated WebSocket with cabin-based rooms for multi-tenant isolation.
 */
import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/config";
import logger from "./logger";

let io: Server | null = null;

interface SocketUser {
  userId: string;
  username: string;
  role: string;
  cabinId?: string;
}

/**
 * Initialize Socket.io server on the existing HTTP server.
 * Call this once in server.new.ts after creating the HTTP server.
 */
export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/ws",
  });

  // ── JWT authentication middleware ──────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error("Chybí autentizační token"));
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as SocketUser;
      (socket as Socket & { user: SocketUser }).user = payload;
      next();
    } catch {
      next(new Error("Neplatný token"));
    }
  });

  // ── Connection handler ────────────────────────────────────────────────
  io.on("connection", (socket: Socket & { user?: SocketUser }) => {
    const user = socket.user;
    if (!user) {
      socket.disconnect();
      return;
    }

    // Join cabin-specific room for tenant isolation
    if (user.cabinId) {
      socket.join(`cabin:${user.cabinId}`);
    }

    logger.info("SOCKET", "Client connected", {
      userId: user.userId,
      username: user.username,
      cabinId: user.cabinId,
    });

    socket.on("disconnect", () => {
      logger.info("SOCKET", "Client disconnected", {
        userId: user.userId,
      });
    });
  });

  logger.info("SOCKET", "Socket.io server initialized");
  return io;
}

/**
 * Get the Socket.io server instance.
 * Returns null if not yet initialized.
 */
export function getIO(): Server | null {
  return io;
}

/**
 * Emit an event to all clients in a specific cabin room.
 */
export function emitToCabin(cabinId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(`cabin:${cabinId}`).emit(event, data);
}
