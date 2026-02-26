import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";

const router = Router();

// ============================================================================
//              PATCH /api/workspace/handover-note — Uložit vzkaz na lednici
// ============================================================================
router.patch("/handover-note", protect, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  if (req.user.role === "guest") {
    return res.status(403).json({ message: "Hosté nemohou upravovat vzkaz." });
  }

  const { note } = req.body;

  if (note === undefined || note === null || typeof note !== "string") {
    return res.status(400).json({ message: "Chybí text vzkazu." });
  }

  if (note.length > 300) {
    return res.status(400).json({ message: "Vzkaz je příliš dlouhý (max 300 znaků)." });
  }

  try {
    const settings = await prisma.appSettings.upsert({
      where: { id: "singleton" },
      update: { pinnedHandoverNote: note.trim() || null },
      create: { id: "singleton", pinnedHandoverNote: note.trim() || null },
    });

    logger.info("WORKSPACE", "Pinned handover note updated", { userId: req.user.userId });
    res.json({ pinnedHandoverNote: settings.pinnedHandoverNote });
  } catch (error) {
    logger.error("WORKSPACE", "Update handover note error", { error: String(error) });
    res.status(500).json({ message: "Chyba při ukládání vzkazu." });
  }
});

export default router;
