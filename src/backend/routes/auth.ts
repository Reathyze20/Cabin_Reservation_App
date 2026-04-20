import { Router, Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../config/config";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";
import { sendPasswordResetEmail, sendVerificationEmailWithPIN, sendVerificationEmailWithToken } from "../../utils/email";
import { validate } from "../../validators/validate";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, verifyEmailSchema } from "../../validators/schemas";
import { protect } from "../../middleware/authMiddleware";

const router = Router();

const PASSWORD_RESET_EXPIRY_MS = 2 * 60 * 60 * 1000;
const PASSWORD_RESET_GENERIC_MESSAGE = "Pokud účet existuje a má nastavený e-mail pro obnovu hesla, poslali jsme vám odkaz pro nastavení nového hesla.";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a URL-safe slug from a Czech/Slovak cabin name.
 * "Chalupa pod Kletí"  → "chalupa-pod-kleti"
 * "Třebenice – U rybníka" → "trebenice-u-rybnika"
 */
function generateSubdomain(name: string): string {
  const czechMap: Record<string, string> = {
    á: "a", č: "c", ď: "d", é: "e", ě: "e", í: "i", ň: "n",
    ó: "o", ř: "r", š: "s", ť: "t", ú: "u", ů: "u", ý: "y", ž: "z",
  };

  return name
    .toLowerCase()
    .replace(/[áčďéěíňóřšťúůýž]/g, (ch) => czechMap[ch] || ch)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

/**
 * Ensure subdomain is unique — append random suffix if collision.
 */
async function ensureUniqueSubdomain(base: string): Promise<string> {
  let candidate = base;
  let attempt = 0;

  while (attempt < 10) {
    const existing = await prisma.cabin.findUnique({ where: { subdomain: candidate } });
    if (!existing) return candidate;

    const suffix = crypto.randomBytes(3).toString("hex");
    candidate = `${base}-${suffix}`.slice(0, 50);
    attempt++;
  }

  return `cabin-${crypto.randomBytes(6).toString("hex")}`;
}

// ============================================================================
//                                LOGIN
// ============================================================================
router.post("/login", validate(loginSchema), async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
    });

    if (!user) {
      return res.status(401).json({ message: "Nesprávné uživatelské jméno." });
    }

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Nesprávné heslo." });
    }

    if (user.isBanned) {
      logger.warn("AUTH", "Blocked login attempt for banned user", {
        userId: user.id,
        username: user.username,
      });
      return res.status(403).json({
        message: "Tento účet byl zablokován. Kontaktujte administrátora.",
        code: "ACCOUNT_BANNED",
      });
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
        await sendVerificationEmailWithPIN(user.email as string, code as string);
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
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        cabinId: user.cabinId,
        isSuperAdmin: user.isSuperAdmin,
      },
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
      cabinId: user.cabinId,
      isSuperAdmin: user.isSuperAdmin,
    });
  } catch (error) {
    logger.error("AUTH", "Login error", { error: String(error), stack: (error as Error).stack });
    res.status(500).json({ message: "Chyba serveru." });
  }
});

// ============================================================================
//                      REGISTER (Workspace Onboarding)
//   Creates Cabin + Admin User in a single transaction
// ============================================================================
router.post("/register", async (req: Request, res: Response) => {
  // ── Zod validation ───────────────────────────────────────────────────
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return res.status(400).json({ message: firstError.message });
  }

  const { cabinName, subdomain: requestedSubdomain, weatherLocation, username, email, password, color } = parsed.data;

  try {
    // ── Pre-flight: check for existing user / email ────────────────────
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: username, mode: "insensitive" } },
          { email: { equals: email, mode: "insensitive" } },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.username.toLowerCase() === username.toLowerCase()) {
        return res.status(409).json({ message: "Uživatelské jméno již existuje." });
      } else {
        return res.status(409).json({ message: "E-mail je již připojen k jinému účtu." });
      }
    }

    // ── Generate unique subdomain ──────────────────────────────────────
    const baseSubdomain = requestedSubdomain
      ? generateSubdomain(requestedSubdomain)
      : generateSubdomain(cabinName);
    const uniqueSubdomain = await ensureUniqueSubdomain(baseSubdomain);

    // ── Prepare auth data ──────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, 10);

    // First user in the entire system gets auto-verified admin
    const globalUserCount = await prisma.user.count();
    const isFirstUser = globalUserCount === 0;
    const role = "admin"; // Creator of a cabin is always admin of that cabin

    const verificationToken = isFirstUser
      ? null
      : crypto.randomBytes(32).toString("hex");

    const verificationCode = isFirstUser
      ? null
      : Math.floor(100000 + Math.random() * 900000).toString();

    // ── Atomic transaction: Cabin + User ───────────────────────────────
    const { newCabin, newUser } = await prisma.$transaction(async (tx) => {
      // 1. Create cabin
      const cabin = await tx.cabin.create({
        data: {
          name: cabinName.trim(),
          subdomain: uniqueSubdomain,
          weatherLocation: weatherLocation.trim(),
        },
      });

      // 2. Create user as admin of this cabin
      const user = await tx.user.create({
        data: {
          username,
          email,
          passwordHash,
          color: color || "#FFB300",
          role,
          cabinId: cabin.id,
          isVerified: isFirstUser,
          isEmailVerified: isFirstUser,
          verificationToken,
          verificationCode,
        },
      });

      return { newCabin: cabin, newUser: user };
    });

    logger.info("AUTH", "New workspace registered", {
      cabinId: newCabin.id,
      cabinName: newCabin.name,
      subdomain: newCabin.subdomain,
      userId: newUser.id,
      username: newUser.username,
    });

    // ── First user: auto-verified, done ────────────────────────────────
    if (isFirstUser) {
      return res.status(201).json({
        message: "Registrace úspěšná (první uživatel — účet je automaticky aktivní).",
      });
    }

    // ── Send verification email ────────────────────────────────────────
    try {
      await sendVerificationEmailWithToken(email, verificationToken!);

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
        testToken: verificationToken,
      });
    }
  } catch (error) {
    logger.error("AUTH", "Register error", { error: String(error), stack: (error as Error).stack });
    res.status(500).json({ message: "Chyba serveru." });
  }
});

// ============================================================================
//                       FORGOT PASSWORD
// ============================================================================
router.post("/forgot-password", validate(forgotPasswordSchema), async (req: Request, res: Response) => {
  const { identifier } = req.body;

  try {
    const normalizedIdentifier = identifier.trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: normalizedIdentifier, mode: "insensitive" } },
          { username: { equals: normalizedIdentifier, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        isBanned: true,
      },
    });

    if (!user) {
      return res.json({ message: PASSWORD_RESET_GENERIC_MESSAGE });
    }

    if (user.isBanned) {
      logger.warn("AUTH", "Password reset requested for banned user", { userId: user.id });
      return res.json({ message: PASSWORD_RESET_GENERIC_MESSAGE });
    }

    if (!user.email) {
      logger.warn("AUTH", "Password reset requested for user without email", { userId: user.id, username: user.username });
      return res.json({ message: PASSWORD_RESET_GENERIC_MESSAGE });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const passwordResetToken = hashToken(rawToken);
    const passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken,
        passwordResetExpiresAt,
      },
    });

    try {
      await sendPasswordResetEmail(user.email, rawToken);
      logger.info("AUTH", "Password reset email queued", { userId: user.id });
    } catch (emailError) {
      logger.error("AUTH", "Failed to send password reset email", { userId: user.id, error: String(emailError) });
    }

    return res.json({ message: PASSWORD_RESET_GENERIC_MESSAGE });
  } catch (error) {
    logger.error("AUTH", "Forgot password error", { error: String(error) });
    return res.status(500).json({ message: "Chyba serveru." });
  }
});

// ============================================================================
//                       VALIDATE RESET TOKEN
// ============================================================================
router.get("/reset-password-token", async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token || typeof token !== "string") {
    return res.status(400).json({ message: "Chybí resetovací token." });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashToken(token),
        passwordResetExpiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!user) {
      return res.status(400).json({ message: "Resetovací odkaz je neplatný nebo již vypršel." });
    }

    return res.json({ message: "Resetovací odkaz je platný." });
  } catch (error) {
    logger.error("AUTH", "Validate reset token error", { error: String(error) });
    return res.status(500).json({ message: "Chyba serveru při ověřování odkazu." });
  }
});

// ============================================================================
//                       RESET PASSWORD
// ============================================================================
router.post("/reset-password", validate(resetPasswordSchema), async (req: Request, res: Response) => {
  const { token, password } = req.body;

  try {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashToken(token),
        passwordResetExpiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        username: true,
      },
    });

    if (!user) {
      return res.status(400).json({ message: "Resetovací odkaz je neplatný nebo již vypršel." });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(password, 10),
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });

    logger.info("AUTH", "Password reset completed", { userId: user.id, username: user.username });

    return res.json({ message: "Heslo bylo úspěšně změněno. Nyní se můžete přihlásit." });
  } catch (error) {
    logger.error("AUTH", "Reset password error", { error: String(error) });
    return res.status(500).json({ message: "Chyba serveru." });
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
router.post("/verify-email", validate(verifyEmailSchema), async (req: Request, res: Response) => {
  const { username, code } = req.body;

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

// ============================================================================
//  GET /api/auth/refresh-token — Re-issue JWT with current data from DB
//  Used when user has stale token (e.g. cabinId was null at login time,
//  but was later assigned by admin or invite acceptance).
// ============================================================================
router.get("/refresh-token", protect, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Neautorizováno" });

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        username: true,
        role: true,
        cabinId: true,
        animalIcon: true,
        color: true,
        isSuperAdmin: true,
      },
    });

    if (!user) return res.status(404).json({ message: "Uživatel nenalezen." });

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        cabinId: user.cabinId,
        isSuperAdmin: user.isSuperAdmin,
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    logger.info("AUTH", "Token refreshed", { userId: user.id, hasCabin: !!user.cabinId });

    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json({
      token,
      username: user.username,
      userId: user.id,
      role: user.role,
      animalIcon: user.animalIcon,
      cabinId: user.cabinId,
      isSuperAdmin: user.isSuperAdmin,
    });
  } catch (error) {
    logger.error("AUTH", "Refresh token error", { error: String(error) });
    res.status(500).json({ message: "Chyba serveru." });
  }
});

export default router;
