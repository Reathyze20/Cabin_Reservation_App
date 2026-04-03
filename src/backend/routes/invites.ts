/* ============================================================================
   routes/invites.ts — Invite link management (magic links to join a cabin)
   ============================================================================ */
import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../config/config";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";
import { protect } from "../../middleware/authMiddleware";
import { requireCabin } from "../../middleware/cabinMiddleware";
import { validate } from "../../validators/validate";
import { createInviteSchema, acceptInviteSchema } from "../../validators/schemas";

const router = Router();

// ── Helper: random color for new users ──────────────────────────────────────
const COLORS = [
  "#2d6a4f", "#40916c", "#52b788",
  "#bf6c3d", "#c68b3f", "#7a5b42",
  "#a0522d", "#6b7c47", "#8fa37a",
  "#c1877a", "#d4956a", "#5c7a6b",
  "#8b6914", "#4a6741", "#7d6c5a",
];
function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

// ── Helper: random animal icon for new users ────────────────────────────────
const AVATAR_IDS = ["liska", "vlk", "jelen", "rys", "veverka", "kralik", "jezek", "pes", "krava", "ovce", "kun", "slepice", "zaba", "had", "lev", "tygr", "slon", "panda", "koala", "klokan", "zebra", "zirafa", "surikata"];
function randomAnimal(): string {
  return AVATAR_IDS[Math.floor(Math.random() * AVATAR_IDS.length)];
}

// ============================================================================
//  POST /api/invites — Create a new invite link (admin only)
// ============================================================================
router.post("/", protect, requireCabin, validate(createInviteSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Neautorizováno" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Pouze admin může vytvářet pozvánky." });

    const { role = "user", maxUses, expiresInDays = 7 } = req.body;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const invite = await prisma.inviteLink.create({
      data: {
        cabinId: req.user.cabinId!,
        createdById: req.user.userId,
        role,
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt,
      },
      select: {
        id: true,
        token: true,
        role: true,
        maxUses: true,
        usedCount: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    logger.info("INVITES", "Invite link created", {
      inviteId: invite.id,
      cabinId: req.user.cabinId,
      role,
      maxUses,
      expiresAt: invite.expiresAt.toISOString(),
    });

    res.status(201).json(invite);
  } catch (error) {
    logger.error("INVITES", "Failed to create invite link", { error: String(error) });
    res.status(500).json({ message: "Interní chyba serveru" });
  }
});

// ============================================================================
//  GET /api/invites — List all invite links for current cabin (admin only)
// ============================================================================
router.get("/", protect, requireCabin, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Neautorizováno" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Pouze admin." });

    const invites = await prisma.inviteLink.findMany({
      where: { cabinId: req.user.cabinId! },
      select: {
        id: true,
        token: true,
        role: true,
        maxUses: true,
        usedCount: true,
        expiresAt: true,
        createdAt: true,
        createdBy: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(invites);
  } catch (error) {
    logger.error("INVITES", "Failed to list invite links", { error: String(error) });
    res.status(500).json({ message: "Interní chyba serveru" });
  }
});

// ============================================================================
//  DELETE /api/invites/:id — Revoke an invite link (admin only)
// ============================================================================
router.delete("/:id", protect, requireCabin, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Neautorizováno" });
    if (req.user.role !== "admin") return res.status(403).json({ message: "Pouze admin." });

    const { id } = req.params;

    const invite = await prisma.inviteLink.findFirst({
      where: { id, cabinId: req.user.cabinId! },
    });

    if (!invite) return res.status(404).json({ message: "Pozvánka nenalezena." });

    await prisma.inviteLink.delete({ where: { id } });

    logger.info("INVITES", "Invite link revoked", { inviteId: id, cabinId: req.user.cabinId });
    res.status(204).send();
  } catch (error) {
    logger.error("INVITES", "Failed to revoke invite link", { error: String(error) });
    res.status(500).json({ message: "Interní chyba serveru" });
  }
});

// ============================================================================
//  GET /api/invites/validate/:token — Validate an invite (PUBLIC, no auth)
// ============================================================================
router.get("/validate/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const invite = await prisma.inviteLink.findUnique({
      where: { token },
      select: {
        id: true,
        role: true,
        maxUses: true,
        usedCount: true,
        expiresAt: true,
        cabin: { select: { name: true, welcomeMessage: true } },
        createdBy: { select: { username: true, animalIcon: true } },
      },
    });

    if (!invite) {
      return res.status(404).json({ valid: false, message: "Pozvánka neexistuje nebo byla zrušena." });
    }

    if (new Date() > invite.expiresAt) {
      return res.status(410).json({ valid: false, message: "Platnost pozvánky vypršela." });
    }

    if (invite.maxUses !== null && invite.usedCount >= invite.maxUses) {
      return res.status(410).json({ valid: false, message: "Pozvánka byla již plně využita." });
    }

    res.json({
      valid: true,
      cabinName: invite.cabin.name,
      welcomeMessage: invite.cabin.welcomeMessage || null,
      role: invite.role,
      invitedBy: invite.createdBy.username,
      invitedByIcon: invite.createdBy.animalIcon || null,
    });
  } catch (error) {
    logger.error("INVITES", "Failed to validate invite", { error: String(error) });
    res.status(500).json({ valid: false, message: "Interní chyba serveru" });
  }
});

// ============================================================================
//  POST /api/invites/accept/:token — Accept invite & create account (PUBLIC)
// ============================================================================
router.post("/accept/:token", validate(acceptInviteSchema), async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { username, password, email, color, animalIcon } = req.body;

    // Check for existing username
    const existingUser = await prisma.user.findFirst({
      where: { username: { equals: username.trim(), mode: "insensitive" } },
    });
    if (existingUser) {
      return res.status(409).json({ message: "Toto uživatelské jméno je již obsazeno." });
    }

    // Find and validate invite
    const invite = await prisma.inviteLink.findUnique({
      where: { token },
      include: { cabin: { select: { name: true } } },
    });

    if (!invite) {
      return res.status(404).json({ message: "Pozvánka neexistuje nebo byla zrušena." });
    }

    if (new Date() > invite.expiresAt) {
      return res.status(410).json({ message: "Platnost pozvánky vypršela." });
    }

    if (invite.maxUses !== null && invite.usedCount >= invite.maxUses) {
      return res.status(410).json({ message: "Pozvánka byla již plně využita." });
    }

    // Check email uniqueness if provided
    if (email) {
      const existingEmail = await prisma.user.findFirst({
        where: { email: { equals: email.trim(), mode: "insensitive" } },
      });
      if (existingEmail) {
        return res.status(409).json({ message: "Tento e-mail je již registrován." });
      }
    }

    // Create user + increment usedCount atomically
    const passwordHash = await bcrypt.hash(password, 10);

    // Use provided color/icon or random fallback
    const userColor = (color && typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color)) ? color : randomColor();
    const userIcon = (animalIcon && typeof animalIcon === "string") ? animalIcon : randomAnimal();

    const [newUser] = await prisma.$transaction([
      prisma.user.create({
        data: {
          username: username.trim(),
          passwordHash,
          color: userColor,
          animalIcon: userIcon,
          email: email ? email.trim() : null,
          role: invite.role,
          cabinId: invite.cabinId,
          isVerified: true,      // Invited users are pre-verified
          isEmailVerified: !!email, // If email provided at invite, consider it verified
        },
      }),
      prisma.inviteLink.update({
        where: { id: invite.id },
        data: { usedCount: { increment: 1 } },
      }),
    ]);

    // Generate JWT — user is immediately logged in
    const jwtToken = jwt.sign(
      {
        userId: newUser.id,
        username: newUser.username,
        role: newUser.role,
        cabinId: newUser.cabinId,
      },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

    logger.info("INVITES", "Invite accepted — new user created", {
      userId: newUser.id,
      username: newUser.username,
      cabinId: invite.cabinId,
      cabinName: invite.cabin.name,
      inviteId: invite.id,
      role: invite.role,
    });

    res.status(201).json({
      token: jwtToken,
      username: newUser.username,
      userId: newUser.id,
      role: newUser.role,
      color: newUser.color,
      animalIcon: newUser.animalIcon,
      cabinId: newUser.cabinId,
      cabinName: invite.cabin.name,
    });
  } catch (error) {
    logger.error("INVITES", "Failed to accept invite", { error: String(error) });
    res.status(500).json({ message: "Interní chyba serveru" });
  }
});

export default router;
