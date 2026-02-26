import { Router, Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../config/config";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";

// Legacy PIN-based email (nodemailer)
import { sendVerificationEmail as sendPinEmail } from "../../utils/email";
// New token-based email (Resend)
import { sendVerificationEmail as sendTokenEmail } from "../../utils/mailer";

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

    if (!user) {
      return res.status(401).json({ message: "Uživatel nenalezen." });
    }

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Nesprávné heslo." });
    }

    // ── Token-based verification check (new SaaS flow) ──────────────────
    if (!user.isVerified && user.role !== "admin") {
      // If user still has a verificationToken, they used the new flow
      if (user.verificationToken) {
        return res.status(403).json({
          message: "Nejprve ověřte svůj e-mail. Zkontrolujte svou schránku a klikněte na aktivační odkaz.",
          needsVerification: true,
        });
      }

      // ── Legacy PIN-based verification fallback ──────────────────────────
      let code = user.verificationCode;
      if (!code) {
        code = Math.floor(100000 + Math.random() * 900000).toString();
        await prisma.user.update({
          where: { id: user.id },
          data: { verificationCode: code }
        });
      }

      try {
        await sendPinEmail(user.email as string, code as string);
        return res.status(403).json({ message: "Vaše e-mailová adresa ještě nebyla ověřena. Odeslali jsme vám nový ověřovací kód na e-mail." });
      } catch (err) {
        logger.error("AUTH", "Failed to resend verification email during login", { error: String(err) });
        return res.status(403).json({
          message: "Vaše e-mailová adresa ještě nebyla ověřena a e-mail se nepodařilo odeslat. Kontaktujte administrátora.",
          testCode: code
        });
      }
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
    const isAdmin = role === "admin";
    const isEmailVerified = isAdmin;

    // Generate token-based verification token (new SaaS flow)
    const verificationToken = isAdmin
      ? null
      : crypto.randomBytes(32).toString("hex");

    // Also generate legacy PIN code for backward compat
    const verificationCode = isAdmin
      ? null
      : Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        color,
        role,
        isEmailVerified,
        verificationCode,
        isVerified: isAdmin,
        verificationToken,
      },
    });

    if (isAdmin) {
      return res.status(201).json({
        message: "Registrace úspěšná (jste admin, účet je automaticky aktivní).",
      });
    }

    // Send token-based verification email via Resend
    try {
      await sendTokenEmail(email, verificationToken!);

      res.status(201).json({
        message: "Děkujeme za registraci! Poslali jsme vám e-mail s odkazem pro aktivaci účtu. Zkontrolujte svou schránku.",
        requiresVerification: true,
      });
    } catch (emailError) {
      logger.error("AUTH", `Failed to send verification email for ${email}`, {
        error: String(emailError),
      });

      // Fallback — log token for testing/dev
      logger.info(
        "AUTH",
        `=== NOUZOVÝ OVĚŘOVACÍ TOKEN PRO TESTOVÁNÍ: ${verificationToken} ===`
      );

      res.status(201).json({
        message: "Registrace proběhla, ale e-mail s aktivačním odkazem se nepodařilo odeslat. Kontaktujte administrátora.",
        requiresVerification: true,
        testToken: verificationToken, // only shown when email fails
      });
    }
  } catch (error) {
    logger.error("AUTH", "Register error", { error: String(error), stack: (error as Error).stack });
    res.status(500).json({ message: "Chyba serveru." });
  }
});

// ============================================================================
//                       VERIFY EMAIL (token-based — new SaaS flow)
// ============================================================================
router.get("/verify-token", async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token || typeof token !== "string") {
    return res.status(400).json({ message: "Chybí ověřovací token." });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      return res.status(400).json({
        message: "Neplatný nebo expirovaný ověřovací odkaz.",
      });
    }

    if (user.isVerified) {
      return res.json({ message: "Tento účet již byl ověřen. Můžete se přihlásit." });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        // Also mark legacy field as verified
        isEmailVerified: true,
        verificationCode: null,
      },
    });

    logger.info("AUTH", `User ${user.username} verified via token`, {
      userId: user.id,
    });

    res.json({
      message: "Účet byl úspěšně aktivován! Nyní se můžete přihlásit.",
    });
  } catch (error) {
    logger.error("AUTH", "Token verification error", {
      error: String(error),
    });
    res.status(500).json({ message: "Chyba serveru při ověřování." });
  }
});

// ============================================================================
//                       VERIFY EMAIL (legacy PIN-based)
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
      data: {
        isEmailVerified: true,
        verificationCode: null,
        isVerified: true,
        verificationToken: null,
      }
    });

    res.json({ message: "E-mail byl úspěšně ověřen. Nyní se můžete přihlásit." });
  } catch (error) {
    logger.error("AUTH", "Verify error", { error: String(error) });
    res.status(500).json({ message: "Chyba serveru při ověřování." });
  }
});

export default router;
