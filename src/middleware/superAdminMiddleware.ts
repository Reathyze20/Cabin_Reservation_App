/* ============================================================================
   middleware/superAdminMiddleware.ts
   Super Admin authorization middleware
   ============================================================================ */

import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import logger from "../utils/logger";

/**
 * Middleware that checks if the authenticated user has Super Admin privileges.
 * 
 * Prerequisites:
 * - Must be called AFTER authMiddleware (protect)
 * - Requires req.user to be populated
 * 
 * Returns 403 if user is not a Super Admin.
 */
export const requireSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.userId) {
      res.status(401).json({ message: "Neautorizováno" });
      return;
    }

    // Fetch user from database to check isSuperAdmin flag
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { isSuperAdmin: true, isBanned: true },
    });

    if (!user) {
      res.status(404).json({ message: "Uživatel nenalezen" });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({ message: "Váš účet byl pozastaven. Kontaktujte podporu." });
      return;
    }

    if (!user.isSuperAdmin) {
      logger.warn("SUPERADMIN", `Unauthorized Super Admin access attempt by userId: ${req.user.userId}`);
      res.status(403).json({ message: "Přístup odepřen. Tato sekce je dostupná pouze Super Adminům." });
      return;
    }

    // User is Super Admin — proceed
    next();
  } catch (error) {
    logger.error("SUPERADMIN", "Error in requireSuperAdmin middleware", { error: String(error) });
    res.status(500).json({ message: "Interní chyba serveru" });
  }
};
