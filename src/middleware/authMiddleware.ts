// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/config";
import { JwtPayload } from "../types";
import logger from "../utils/logger";
import prisma from "../utils/prisma";
import { syncAuthContextFromUser } from "../utils/asyncContext";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload; // Přidáme uživatelská data do requestu
    }
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Neautorizováno, žádný token." });
  }

  const token = authHeader.split(" ")[1];

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    logger.error("AUTH", "Token verification error", { error: String(error) });
    return res.status(401).json({ message: "Neplatný token." });
  }

  if (!decoded || !decoded.userId || !decoded.username) {
    logger.warn("AUTH", "Invalid token payload format", { decoded });
    return res.status(401).json({ message: "Neplatný token." });
  }

  try {
    // Always hydrate auth state from DB so role/cabin/ban changes take effect immediately.
    const activeUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        role: true,
        cabinId: true,
        isSuperAdmin: true,
        isBanned: true,
      },
    });

    if (!activeUser) {
      logger.warn("AUTH", "Authenticated user no longer exists", { userId: decoded.userId });
      return res.status(401).json({ message: "Neplatný token." });
    }

    if (activeUser.isBanned) {
      logger.warn("AUTH", "Blocked request from banned user", { userId: activeUser.id });
      return res.status(403).json({
        message: "Tento účet byl zablokován. Kontaktujte administrátora.",
        code: "ACCOUNT_BANNED",
      });
    }

    req.user = {
      userId: activeUser.id,
      username: activeUser.username,
      role: activeUser.role,
      cabinId: activeUser.cabinId,
      isSuperAdmin: activeUser.isSuperAdmin,
    };

    syncAuthContextFromUser(req.user);

    next();
  } catch (error) {
    logger.error("AUTH", "Failed to hydrate authenticated user", { error: String(error), userId: decoded.userId });
    return res.status(500).json({ message: "Chyba serveru při ověřování uživatele." });
  }
};
