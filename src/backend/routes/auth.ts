import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../config/config";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";

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

    if (!user.isEmailVerified && user.role !== "admin") {
      return res.status(403).json({ message: "Vaše e-mailová adresa ještě nebyla ověřena. Prosím, dokončete registraci." });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      token,
      username: user.username,
      userId: user.id,
      role: user.role,
      color: user.color,
      animalIcon: user.animalIcon,
    });
  } catch (error) {
    logger.error("AUTH", "Login error", { error: String(error), stack: (error as Error).stack });
    res.status(500).json({ message: "Chyba serveru." });
  }
});

// ============================================================================
//                             REGISTER
// ============================================================================
router.post("/register", async (req: Request, res: Response) => {
  const { username, password, color, email } = req.body;
  if (!username || !password || !color || !email) {
    return res.status(400).json({ message: "Chybí povinné údaje." });
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: username, mode: "insensitive" } },
          { email: { equals: email, mode: "insensitive" } }
        ]
      },
    });

    if (existingUser) {
      if (existingUser.username.toLowerCase() === username.toLowerCase()) {
        return res.status(409).json({ message: "Uživatelské jméno již existuje." });
      } else {
        return res.status(409).json({ message: "E-mail je již připojen k jinému účtu." });
      }
    }

    // První uživatel je automaticky admin
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? "admin" : "user";
    // Admin automaticky overen (pro jistotu u prvotni instalace)
    const isEmailVerified = role === "admin";

    // Vygenerovat kod napr. "123456"
    const verificationCode = isEmailVerified ? null : Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        color,
        role,
        isEmailVerified,
        verificationCode,
      },
    });

    if (!isEmailVerified) {
      // Zde simulujeme odeslani emailu
      logger.info("AUTH", `=========================================`);
      logger.info("AUTH", `SIMULACE E-MAILU pro ${email}`);
      logger.info("AUTH", `Váš ověřovací kód je: ${verificationCode}`);
      logger.info("AUTH", `=========================================`);
      res.status(201).json({ message: "Registrace proběhla úspěšně. Byl odeslán ověřovací kód." });
    } else {
      res.status(201).json({ message: "Registrace úspěšná (jste admin)." });
    }
  } catch (error) {
    logger.error("AUTH", "Register error", { error: String(error), stack: (error as Error).stack });
    res.status(500).json({ message: "Chyba serveru." });
  }
});

// ============================================================================
//                             VERIFY EMAIL
// ============================================================================
router.post("/verify-email", async (req: Request, res: Response) => {
  const { username, code } = req.body;
  if (!username || !code) return res.status(400).json({ message: "Chybí jméno nebo PIN." });

  try {
    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } }
    });

    if (!user) {
      return res.status(404).json({ message: "Uživatel nenalezen." });
    }

    if (user.isEmailVerified) {
      return res.json({ message: "Tento účet již byl ověřen." });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ message: "Nesprávný verifikační kód." });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, verificationCode: null }
    });

    res.json({ message: "E-mail byl úspěšně ověřen. Nyní se můžete přihlásit." });
  } catch (error) {
    logger.error("AUTH", "Verify error", { error: String(error) });
    res.status(500).json({ message: "Chyba serveru při ověřování." });
  }
});

export default router;
