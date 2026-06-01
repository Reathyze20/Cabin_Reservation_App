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

function readBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.split(" ")[1] ?? null;
}

function isValidJwtPayload(decoded: JwtPayload | null | undefined): decoded is JwtPayload {
  return Boolean(decoded?.userId && decoded?.username && decoded?.role);
}

function buildUserFromToken(decoded: JwtPayload): JwtPayload {
  return {
    userId: decoded.userId,
    username: decoded.username,
    role: decoded.role,
    cabinId: decoded.cabinId ?? null,
    isSuperAdmin: decoded.isSuperAdmin === true,
  };
}

async function hydrateAuthenticatedUser(decoded: JwtPayload): Promise<
  | { status: "ok"; user: JwtPayload }
  | { status: "missing" }
  | { status: "banned" }
> {
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
    return { status: "missing" };
  }

  if (activeUser.isBanned) {
    logger.warn("AUTH", "Blocked request from banned user", { userId: activeUser.id });
    return { status: "banned" };
  }

  return {
    status: "ok",
    user: {
      userId: activeUser.id,
      username: activeUser.username,
      role: activeUser.role,
      cabinId: activeUser.cabinId,
      isSuperAdmin: activeUser.isSuperAdmin,
    },
  };
}

async function authenticateRequest(
  req: Request,
  res: Response,
  options?: { allowTokenFallbackOnHydrationError?: boolean },
): Promise<boolean> {
  const token = readBearerToken(req);

  if (!token) {
    res.status(401).json({ message: "Neautorizováno, žádný token." });
    return false;
  }

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    logger.error("AUTH", "Token verification error", { error: String(error) });
    res.status(401).json({ message: "Neplatný token." });
    return false;
  }

  if (!isValidJwtPayload(decoded)) {
    logger.warn("AUTH", "Invalid token payload format", { decoded });
    res.status(401).json({ message: "Neplatný token." });
    return false;
  }

  try {
    const hydratedUser = await hydrateAuthenticatedUser(decoded);

    if (hydratedUser.status === "missing") {
      res.status(401).json({ message: "Neplatný token." });
      return false;
    }

    if (hydratedUser.status === "banned") {
      res.status(403).json({
        message: "Tento účet byl zablokován. Kontaktujte administrátora.",
        code: "ACCOUNT_BANNED",
      });
      return false;
    }

    req.user = hydratedUser.user;
    syncAuthContextFromUser(req.user);
    return true;
  } catch (error) {
    if (!options?.allowTokenFallbackOnHydrationError) {
      logger.error("AUTH", "Failed to hydrate authenticated user", { error: String(error), userId: decoded.userId });
      res.status(500).json({ message: "Chyba serveru při ověřování uživatele." });
      return false;
    }

    req.user = buildUserFromToken(decoded);
    syncAuthContextFromUser(req.user);

    logger.warn("AUTH", "Using JWT fallback after auth hydration failure", {
      error: String(error),
      userId: decoded.userId,
      role: decoded.role,
      isSuperAdmin: decoded.isSuperAdmin === true,
    });

    return true;
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  const isAuthenticated = await authenticateRequest(req, res);
  if (!isAuthenticated) return;

  next();
};

export const protectWithTokenFallback = async (req: Request, res: Response, next: NextFunction) => {
  const isAuthenticated = await authenticateRequest(req, res, { allowTokenFallbackOnHydrationError: true });
  if (!isAuthenticated) return;

  next();
};
