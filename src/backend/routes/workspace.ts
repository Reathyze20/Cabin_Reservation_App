import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import { requireCabin } from "../../middleware/cabinMiddleware";
import { validate } from "../../validators/validate";
import { updateHandoverNoteSchema } from "../../validators/schemas";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";

const router = Router();

// ============================================================================
//              PATCH /api/workspace/handover-note — Uložit vzkaz na lednici
// ============================================================================
router.patch("/handover-note", protect, requireCabin, validate(updateHandoverNoteSchema), async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  if (req.user.role === "guest") {
    return res.status(403).json({ message: "Hosté nemohou upravovat vzkaz." });
  }

  const { note } = req.body;

  try {
    const settingsId = `cabin_${req.user.cabinId}`;
    const settings = await prisma.appSettings.upsert({
      where: { id: settingsId },
      update: { pinnedHandoverNote: note.trim() || null },
      create: { id: settingsId, pinnedHandoverNote: note.trim() || null },
    });

    logger.info("WORKSPACE", "Pinned handover note updated", { userId: req.user.userId, cabinId: req.user.cabinId });
    res.json({ pinnedHandoverNote: settings.pinnedHandoverNote });
  } catch (error) {
    logger.error("WORKSPACE", "Update handover note error", { error: String(error) });
    res.status(500).json({ message: "Chyba při ukládání vzkazu." });
  }
});

export default router;
