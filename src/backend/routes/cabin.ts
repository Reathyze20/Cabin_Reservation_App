/* ============================================================================
   routes/cabin.ts — Cabin settings CRUD (admin-only configuration)
   ============================================================================ */
import { Router, Request, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { protect } from "../../middleware/authMiddleware";
import { requireCabin } from "../../middleware/cabinMiddleware";
import { validate } from "../../validators/validate";
import { updateCabinSettingsSchema, createCabinSchema } from "../../validators/schemas";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";
import { JWT_SECRET } from "../../config/config";

const router = Router();

// ── Selectable fields for cabin settings ────────────────────────────────
const CABIN_SELECT = {
  id: true,
  name: true,
  subdomain: true,
  description: true,
  welcomeMessage: true,
  rules: true,
  departureChecklist: true,
  coverPhotoUrl: true,
  weatherLocation: true,
  isWinterized: true,
  features: true,
  createdAt: true,
} as const;

const CABIN_SELECT_LEGACY = {
  id: true,
  name: true,
  subdomain: true,
  weatherLocation: true,
  isWinterized: true,
  features: true,
  createdAt: true,
} as const;

const CABIN_SELECT_MINIMAL = {
  id: true,
  name: true,
  subdomain: true,
  createdAt: true,
} as const;

// ============================================================================
//  GET /api/cabin — Get current cabin settings
// ============================================================================
router.get("/", protect, requireCabin, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Neautorizováno" });

    let cabin;
    try {
      cabin = await prisma.cabin.findUnique({
        where: { id: req.user.cabinId! },
        select: CABIN_SELECT,
      });
    } catch (error) {
      // Backward compatibility: local DB may not yet have newest cabin columns
      const code = (error as { code?: string })?.code;
      if (code !== "P2022") throw error;

      logger.warn("CABIN", "Cabin settings fallback to legacy select (missing DB columns)", {
        cabinId: req.user.cabinId,
      });

      let legacyCabin;
      try {
        legacyCabin = await prisma.cabin.findUnique({
          where: { id: req.user.cabinId! },
          select: CABIN_SELECT_LEGACY,
        });
      } catch (legacyError) {
        const legacyCode = (legacyError as { code?: string })?.code;
        if (legacyCode !== "P2022") throw legacyError;

        logger.warn("CABIN", "Cabin settings fallback to minimal select (older DB schema)", {
          cabinId: req.user.cabinId,
        });

        const minimalCabin = await prisma.cabin.findUnique({
          where: { id: req.user.cabinId! },
          select: CABIN_SELECT_MINIMAL,
        });

        if (!minimalCabin) {
          return res.status(404).json({ message: "Chata nenalezena." });
        }

        cabin = {
          ...minimalCabin,
          weatherLocation: null,
          isWinterized: false,
          features: null,
          description: null,
          welcomeMessage: null,
          rules: null,
          departureChecklist: null,
          coverPhotoUrl: null,
        };

        if (!cabin) {
          return res.status(404).json({ message: "Chata nenalezena." });
        }

        return res.json(cabin);
      }

      if (!legacyCabin) {
        return res.status(404).json({ message: "Chata nenalezena." });
      }

      cabin = {
        ...legacyCabin,
        description: null,
        welcomeMessage: null,
        rules: null,
        departureChecklist: null,
        coverPhotoUrl: null,
      };
    }

    if (!cabin) {
      return res.status(404).json({ message: "Chata nenalezena." });
    }

    res.json(cabin);
  } catch (error) {
    logger.error("CABIN", "Failed to read cabin settings", { error: String(error) });
    res.status(500).json({ message: "Interní chyba serveru" });
  }
});

// ============================================================================
//  PATCH /api/cabin — Update cabin settings (admin only)
// ============================================================================
router.patch("/", protect, requireCabin, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Neautorizováno" });
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Pouze admin může měnit nastavení chaty." });
    }

    const {
      name,
      description,
      welcomeMessage,
      rules,
      departureChecklist,
      coverPhotoUrl,
      weatherLocation,
      isWinterized,
      features,
    } = req.body;

    // ── Validation ──────────────────────────────────────────────────────
    const errors: string[] = [];

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
        errors.push("Název chaty musí mít 2–100 znaků.");
      }
    }

    if (description !== undefined && description !== null) {
      if (typeof description !== "string" || description.length > 2000) {
        errors.push("Popis může mít maximálně 2000 znaků.");
      }
    }

    if (welcomeMessage !== undefined && welcomeMessage !== null) {
      if (typeof welcomeMessage !== "string" || welcomeMessage.length > 300) {
        errors.push("Uvítací zpráva může mít maximálně 300 znaků.");
      }
    }

    if (rules !== undefined && rules !== null) {
      if (typeof rules !== "string" || rules.length > 5000) {
        errors.push("Domácí řád může mít maximálně 5000 znaků.");
      }
    }

    if (departureChecklist !== undefined && departureChecklist !== null) {
      if (!Array.isArray(departureChecklist)) {
        errors.push("Odjezdový checklist musí být pole textů.");
      } else if (departureChecklist.length > 15) {
        errors.push("Odjezdový checklist může mít maximálně 15 položek.");
      } else {
        for (const item of departureChecklist) {
          if (typeof item !== "string" || item.trim().length === 0 || item.length > 100) {
            errors.push("Každá položka checklistu musí být neprázdný text (max 100 znaků).");
            break;
          }
        }
      }
    }

    if (weatherLocation !== undefined && weatherLocation !== null) {
      if (typeof weatherLocation !== "string" || weatherLocation.length > 100) {
        errors.push("Lokalita pro počasí může mít maximálně 100 znaků.");
      }
    }

    if (isWinterized !== undefined && typeof isWinterized !== "boolean") {
      errors.push("Zazimování musí být true nebo false.");
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(" ") });
    }

    // ── Build update payload (only provided fields) ─────────────────────
    const data: Record<string, unknown> = {};

    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (welcomeMessage !== undefined) data.welcomeMessage = welcomeMessage?.trim() || null;
    if (rules !== undefined) data.rules = rules?.trim() || null;
    if (departureChecklist !== undefined) {
      data.departureChecklist = departureChecklist
        ? departureChecklist.map((item: string) => item.trim()).filter((item: string) => item.length > 0)
        : null;
    }
    if (coverPhotoUrl !== undefined) data.coverPhotoUrl = coverPhotoUrl || null;
    if (weatherLocation !== undefined) data.weatherLocation = weatherLocation?.trim() || null;
    if (isWinterized !== undefined) data.isWinterized = isWinterized;
    if (features !== undefined) data.features = features;

    const updated = await prisma.cabin.update({
      where: { id: req.user.cabinId! },
      select: CABIN_SELECT,
      data,
    });

    logger.info("CABIN", "Cabin settings updated", {
      cabinId: req.user.cabinId,
      userId: req.user.userId,
      changedFields: Object.keys(data),
    });

    res.json(updated);
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "P2022") {
      logger.warn("CABIN", "Cabin update blocked: DB schema is behind Prisma schema", {
        cabinId: req.user?.cabinId,
        userId: req.user?.userId,
      });
      return res.status(409).json({
        message: "Databáze není aktualizovaná pro nové nastavení chaty. Spusťte prosím migrace.",
      });
    }

    logger.error("CABIN", "Failed to update cabin settings", { error: String(error) });
    res.status(500).json({ message: "Interní chyba serveru" });
  }
});

// ============================================================================
//  POST /api/cabin/create — Create a new cabin for a logged-in user who has no cabin yet
//  Used by the Onboarding flow (multi-tenant SaaS setup)
// ============================================================================
router.post("/create", protect, validate(createCabinSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Neautorizováno" });
    if (req.user.cabinId) {
      return res.status(400).json({ message: "Váš účet již má přiřazenou chatu." });
    }

    const { name } = req.body;

    // Generate a unique subdomain slug
    const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 30) || "chata";
    let subdomain = `${base}-${crypto.randomBytes(3).toString("hex")}`;
    // Ensure uniqueness (collision virtually impossible but we try once more)
    const existing = await prisma.cabin.findUnique({ where: { subdomain } });
    if (existing) {
      subdomain = `${base}-${crypto.randomBytes(4).toString("hex")}`;
    }

    const { cabin, updatedUser } = await prisma.$transaction(async (tx) => {
      const cabin = await tx.cabin.create({
        data: {
          name: name.trim(),
          subdomain,
        },
        select: CABIN_SELECT_MINIMAL,
      });
      const updatedUser = await tx.user.update({
        where: { id: req.user!.userId },
        data: { cabinId: cabin.id, role: "admin" },
        select: {
          id: true,
          username: true,
          role: true,
          animalIcon: true,
          cabinId: true,
          isSuperAdmin: true,
        },
      });
      return { cabin, updatedUser };
    });

    logger.info("CABIN", "New cabin created via onboarding", {
      cabinId: cabin.id,
      cabinName: cabin.name,
      userId: updatedUser.id,
      username: updatedUser.username,
    });

    // Issue a new JWT with the updated cabinId embedded
    const newToken = jwt.sign(
      {
        userId: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
        cabinId: updatedUser.cabinId,
        isSuperAdmin: updatedUser.isSuperAdmin,
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(201).json({
      token: newToken,
      cabinId: cabin.id,
      cabinName: cabin.name,
      userId: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
      animalIcon: updatedUser.animalIcon,
      isSuperAdmin: updatedUser.isSuperAdmin,
    });
  } catch (error) {
    logger.error("CABIN", "Failed to create cabin via onboarding", { error: String(error) });
    res.status(500).json({ message: "Nepodařilo se vytvořit chatu. Zkuste to znovu." });
  }
});

export default router;