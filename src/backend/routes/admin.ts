import { Router, Request, Response } from "express";
import prisma from "../../utils/prisma";
import { protect } from "../../middleware/authMiddleware";
import logger from "../../utils/logger";

const router = Router();

router.get("/system", protect, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Přístup pouze pro administrátora." });
  }

  try {
    const [userCount, reservationCount, photoCount, noteCount] = await Promise.all([
      prisma.user.count(),
      prisma.reservation.count(),
      prisma.galleryPhoto.count(),
      prisma.note.count(),
    ]);

    res.json({
      userCount,
      reservationCount,
      photoCount,
      noteCount,
    });
  } catch (error) {
    logger.error("ADMIN", "Failed to fetch system info", error);
    res.status(500).json({ error: "Failed to fetch system info" });
  }
});

export default router;
