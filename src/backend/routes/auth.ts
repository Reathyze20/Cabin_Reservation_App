import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../config/config";
import prisma from "../../utils/prisma";

const router = Router();

// ============================================================================
//                                LOGIN
// ============================================================================
router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Neplatné přihlašovací údaje." });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      username: user.username,
      userId: user.id,
      role: user.role,
      color: user.color,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Chyba serveru." });
  }
});

// ============================================================================
//                             REGISTER
// ============================================================================
router.post("/register", async (req: Request, res: Response) => {
  const { username, password, color } = req.body;
  if (!username || !password || !color) {
    return res.status(400).json({ message: "Chybí údaje." });
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
    });

    if (existingUser) {
      return res.status(409).json({ message: "Uživatel existuje." });
    }

    // První uživatel je automaticky admin
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? "admin" : "user";

    const newUser = await prisma.user.create({
      data: {
        username,
        passwordHash: await bcrypt.hash(password, 10),
        color,
        role,
      },
    });

    res.status(201).json({ message: "Registrace úspěšná." });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Chyba serveru." });
  }
});

export default router;
