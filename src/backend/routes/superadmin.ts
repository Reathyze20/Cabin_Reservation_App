/* ============================================================================
   routes/superadmin.ts
   Super Admin API endpoints — User management & System logs
   ============================================================================ */

import express, { Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import { requireSuperAdmin } from "../../middleware/superAdminMiddleware";
import { validate } from "../../validators/validate";
import { superadminCreateUserSchema } from "../../validators/schemas";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendSuperadminOnboardingEmail } from "../../utils/email";

const router = express.Router();

// ─── GET /api/superadmin/users ───────────────────────────────────────────────
// Vrátí všechny uživatele systému
router.get("/users", protect, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isSuperAdmin: true,
        isBanned: true,
        isVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(users);
  } catch (error) {
    logger.error("SUPERADMIN", "Failed to fetch users", { error: String(error) });
    res.status(500).json({ message: "Chyba při načítání uživatelů" });
  }
});

// ─── POST /api/superadmin/users ──────────────────────────────────────────────
// Ruční vytvoření uživatele (admin přidává uživatele)
router.post("/users", protect, requireSuperAdmin, validate(superadminCreateUserSchema), async (req: Request, res: Response) => {
  try {
    const { username, email, role } = req.body;
    const isProduction = process.env.NODE_ENV === "production";

    // Kontrola zda uživatel již existuje
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existingUser) {
      res.status(409).json({ message: "Uživatel s tímto jménem nebo e-mailem již existuje" });
      return;
    }

    // Vygeneruj dočasné heslo
    const tempPassword = crypto.randomBytes(8).toString("hex"); // 16 znaků
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Vygeneruj verifikační token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Vytvoř uživatele
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        role: role || "user",
        color: "#" + Math.floor(Math.random() * 16777215).toString(16), // náhodná barva
        animalIcon: "lev", // default ikona
        isVerified: false,
        verificationToken,
      },
    });

    // Pošli onboarding e-mail s aktivačním linkem a dočasným heslem
    let verificationEmailSent = false;
    let exposeFallbackSecrets = false;
    try {
      const emailResult = await sendSuperadminOnboardingEmail(email, verificationToken, tempPassword);
      verificationEmailSent = emailResult.delivered;
      exposeFallbackSecrets = !isProduction && !verificationEmailSent;

      if (verificationEmailSent) {
        logger.info("SUPERADMIN", `User ${username} created and onboarding email sent`, {
          userId: newUser.id,
          email,
        });
      } else {
        logger.warn("SUPERADMIN", `User ${username} created but onboarding email was not delivered`, {
          userId: newUser.id,
          email,
          simulated: true,
        });
      }
    } catch (emailError) {
      logger.error("SUPERADMIN", `Failed to send onboarding email to ${email}`, {
        error: String(emailError),
        userId: newUser.id,
        email,
      });

      if (isProduction) {
        try {
          await prisma.user.delete({ where: { id: newUser.id } });
          logger.warn("SUPERADMIN", "Rolled back user after onboarding email failure", {
            userId: newUser.id,
            email,
          });
          return res.status(503).json({
            message: "Účet nebyl vytvořen, protože se nepodařilo odeslat onboarding e-mail. Zkuste to znovu po opravě SMTP nebo doručování.",
          });
        } catch (cleanupError) {
          logger.error("SUPERADMIN", "Failed to rollback user after onboarding email failure", {
            userId: newUser.id,
            email,
            error: String(cleanupError),
          });
          return res.status(500).json({
            message: "Účet se nepodařilo bezpečně vytvořit. Zkontrolujte stav uživatele a logy, pak zkuste akci znovu.",
          });
        }
      }

      exposeFallbackSecrets = true;
    }

    const response: {
      message: string;
      user: {
        id: string;
        username: string;
        email: string | null;
      };
      verificationEmailSent: boolean;
      tempPassword?: string;
      verificationToken?: string;
    } = {
      message: verificationEmailSent
        ? `Uživatel ${username} byl vytvořen. Onboarding e-mail s aktivačním odkazem a dočasným heslem byl odeslán.`
        : `Uživatel ${username} byl vytvořen, ale onboarding e-mail se nepodařilo odeslat. Použijte nouzové údaje níže.`,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
      },
      verificationEmailSent,
    };

    if (exposeFallbackSecrets) {
      response.tempPassword = tempPassword;
      response.verificationToken = verificationToken;
    }

    res.status(201).json(response);
  } catch (error) {
    logger.error("SUPERADMIN", "Failed to create user", { error: String(error) });
    res.status(500).json({ message: "Chyba při vytváření uživatele" });
  }
});

// ─── PATCH /api/superadmin/users/:id/ban ────────────────────────────────────
// Přepíná stav isBanned (true/false)
router.patch("/users/:id/ban", protect, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { isBanned: true, isSuperAdmin: true, username: true },
    });

    if (!user) {
      res.status(404).json({ message: "Uživatel nenalezen" });
      return;
    }

    // Nelze zabanovat Super Admina
    if (user.isSuperAdmin) {
      res.status(403).json({ message: "Nelze zabanovat Super Admina" });
      return;
    }

    const newBanStatus = !user.isBanned;

    await prisma.user.update({
      where: { id },
      data: { isBanned: newBanStatus },
    });

    logger.info("SUPERADMIN", `User ${user.username} ban status changed`, {
      userId: id,
      isBanned: newBanStatus,
      changedBy: req.user?.userId,
    });

    res.json({
      message: newBanStatus ? "Uživatel byl zabanován" : "Ban byl zrušen",
      isBanned: newBanStatus,
    });
  } catch (error) {
    logger.error("SUPERADMIN", "Failed to toggle ban status", { error: String(error) });
    res.status(500).json({ message: "Chyba při změně stavu účtu" });
  }
});

// ─── GET /api/superadmin/logs/files ──────────────────────────────────────────
router.get("/logs/files", protect, requireSuperAdmin, async (_req: Request, res: Response) => {
  try {
    res.json({ files: logger.listLogFiles() });
  } catch (error) {
    logger.error("SUPERADMIN", "Failed to list log files", { error: String(error) });
    res.status(500).json({ message: "Chyba při načítání seznamu logů" });
  }
});

// ─── GET /api/superadmin/logs ────────────────────────────────────────────────
router.get("/logs", protect, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { date, lines, level, userId, module: mod, source, requestId, path, status, search } = req.query;

    const logs = logger.readLogs({
      date: date as string | undefined,
      lines: lines ? parseInt(lines as string, 10) : 200,
      level: level as string | undefined,
      userId: userId as string | undefined,
      module: mod as string | undefined,
      source: source as string | undefined,
      requestId: requestId as string | undefined,
      path: path as string | undefined,
      status: status ? parseInt(status as string, 10) : undefined,
      search: search as string | undefined,
    });

    res.json({
      date: date ?? new Date().toISOString().split("T")[0],
      count: logs.length,
      logs,
    });
  } catch (error) {
    logger.error("SUPERADMIN", "Failed to fetch logs", { error: String(error) });
    res.status(500).json({ message: "Chyba při načítání logů" });
  }
});

export default router;
