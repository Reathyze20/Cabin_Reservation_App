/* ============================================================================
   middleware/bannedUserMiddleware.ts
   Read-only enforcement for banned users
   ============================================================================ */

import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import logger from "../utils/logger";

/**
 * Middleware that enforces read-only mode for banned users.
 * 
 * Prerequisites:
 * - Must be called AFTER authMiddleware (protect)
 * - Requires req.user to be populated
 * 
 * Blocks POST, PUT, PATCH, DELETE requests if user is banned.
 * Allows GET, HEAD, OPTIONS requests.
 */
export const checkBannedUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Allow read-only methods (GET, HEAD, OPTIONS)
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      next();
      return;
    }

    // For mutating methods (POST, PUT, PATCH, DELETE), check if user is banned
    if (!req.user || !req.user.userId) {
      // If no user authenticated, let authMiddleware handle it
      next();
      return;
    }

    // Check user ban status from database
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { isBanned: true },
    });

    if (!user) {
      res.status(404).json({ message: "Uživatel nenalezen" });
      return;
    }

    if (user.isBanned) {
      logger.warn("BANNED_USER", `Banned user attempted to ${req.method} ${req.path}`, {
        userId: req.user.userId,
        method: req.method,
        path: req.path,
      });

      res.status(403).json({
        message: "Váš účet byl pozastaven. Kontaktujte podporu.",
        reason: "account_suspended",
      });
      return;
    }

    // User is not banned — proceed
    next();
  } catch (error) {
    logger.error("BANNED_USER", "Error in checkBannedUser middleware", { error: String(error) });
    res.status(500).json({ message: "Interní chyba serveru" });
  }
};
