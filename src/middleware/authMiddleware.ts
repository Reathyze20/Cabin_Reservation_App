// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/config";
import { JwtPayload } from "../types"; // Importujeme naše rozhraní

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload; // Přidáme uživatelská data do requestu
    }
  }
}

export const protect = (req: Request, res: Response, next: NextFunction) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1]; // Získáme token z hlavičky

      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload; // Ověříme token a získáme payload

      if (!decoded || !decoded.userId || !decoded.username) {
        // Pokud payload neobsahuje potřebná data, vrátíme chybu
        console.log("Neplatný formát tokenu v payloadu:");
        return res.status(401).json({ message: "Neplatný token." });
      }

      req.user = decoded; // Uložíme payload do requestu
      next(); // Pokračujeme na další middleware nebo route handler
    } catch (error) {
      console.error("Chyba při ověřování tokenu:", error);
      return res.status(401).json({ message: "Neplatný token." });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Neautorizováno, žádný token." });
  }
};
