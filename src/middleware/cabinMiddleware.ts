// src/middleware/cabinMiddleware.ts
import { Request, Response, NextFunction } from "express";

/**
 * Middleware that ensures the authenticated user belongs to a cabin.
 * Must be used AFTER the `protect` middleware (which sets req.user).
 *
 * Returns 403 if the user has no cabinId assigned.
 */
export const requireCabin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.cabinId) {
    return res.status(403).json({
      message: "Nemáte přiřazenou žádnou chatu. Kontaktujte administrátora.",
    });
  }
  next();
};

/**
 * Helper to extract cabinId from the authenticated user.
 * Returns the cabinId string or null.
 */
export const getCabinId = (req: Request): string | null => {
  return req.user?.cabinId ?? null;
};
