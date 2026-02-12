import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";

const router = Router();

// ============================================================================
//                        GET ALL RESERVATIONS
// ============================================================================
router.get("/", protect, async (req: Request, res: Response) => {
  try {
    const reservations = await prisma.reservation.findMany({
      include: {
        user: {
          select: {
            username: true,
            color: true,
          },
        },
      },
    });

    const result = reservations.map((r) => ({
      id: r.id,
      userId: r.userId,
      username: r.user.username,
      from: r.dateFrom.toISOString().split("T")[0],
      to: r.dateTo.toISOString().split("T")[0],
      purpose: r.purpose,
      notes: r.notes,
      status: r.status,
      userColor: r.user.color,
    }));

    res.json(result);
  } catch (error) {
    logger.error("RESERVATIONS", "Get reservations error", { error: String(error) });
    res.status(500).json({ message: "Chyba." });
  }
});

// ============================================================================
//                         CREATE RESERVATION
// ============================================================================
router.post("/", protect, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno." });
  }

  const { from, to, purpose, notes } = req.body;

  if (!from || !to) {
    return res.status(400).json({ message: "Chybí data." });
  }

  try {
    const newStart = new Date(from);
    const newEnd = new Date(to);

    // Check for collision
    const collision = await prisma.reservation.findFirst({
      where: {
        status: { not: "backup" },
        OR: [
          {
            dateFrom: { lte: newEnd },
            dateTo: { gte: newStart },
          },
        ],
      },
    });

    const status = collision ? "backup" : "primary";

    const newReservation = await prisma.reservation.create({
      data: {
        userId: req.user.userId,
        dateFrom: newStart,
        dateTo: newEnd,
        purpose,
        notes,
        status,
      },
      include: {
        user: {
          select: {
            username: true,
            color: true,
          },
        },
      },
    });

    res.status(201).json({
      id: newReservation.id,
      userId: newReservation.userId,
      username: newReservation.user.username,
      from: newReservation.dateFrom.toISOString().split("T")[0],
      to: newReservation.dateTo.toISOString().split("T")[0],
      purpose: newReservation.purpose,
      notes: newReservation.notes,
      status: newReservation.status,
      userColor: newReservation.user.color,
    });
  } catch (error) {
    logger.error("RESERVATIONS", "Create reservation error", { error: String(error), userId: req.user?.userId });
    res.status(500).json({ message: "Chyba." });
  }
});

// ============================================================================
//                        UPDATE RESERVATION
// ============================================================================
router.put("/:id", protect, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno." });
  }

  const { id } = req.params;
  const { purpose, notes, from, to } = req.body;

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return res.status(404).json({ message: "Nenalezeno." });
    }

    if (reservation.userId !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Bez oprávnění." });
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        ...(from && { dateFrom: new Date(from) }),
        ...(to && { dateTo: new Date(to) }),
        ...(purpose && { purpose }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        user: {
          select: {
            username: true,
            color: true,
          },
        },
      },
    });

    res.json({
      id: updated.id,
      userId: updated.userId,
      username: updated.user.username,
      from: updated.dateFrom.toISOString().split("T")[0],
      to: updated.dateTo.toISOString().split("T")[0],
      purpose: updated.purpose,
      notes: updated.notes,
      status: updated.status,
    });
  } catch (error) {
    logger.error("RESERVATIONS", "Update reservation error", { error: String(error), id });
    res.status(500).json({ message: "Chyba." });
  }
});

// ============================================================================
//                        DELETE RESERVATION
// ============================================================================
router.post("/delete", protect, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno." });
  }

  const { id } = req.body;

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return res.status(404).json({ message: "Nenalezeno." });
    }

    if (reservation.userId !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Bez oprávnění." });
    }

    await prisma.reservation.delete({
      where: { id },
    });

    res.json({ message: "Smazáno." });
  } catch (error) {
    logger.error("RESERVATIONS", "Delete reservation error", { error: String(error), id });
    res.status(500).json({ message: "Chyba." });
  }
});

// ============================================================================
//                      ASSIGN RESERVATION TO USER
// ============================================================================
router.post("/:reservationId/assign", protect, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Pouze admin." });
  }

  const { reservationId } = req.params;
  const { newOwnerId } = req.body;

  try {
    const newOwner = await prisma.user.findUnique({
      where: { id: newOwnerId },
    });

    if (!newOwner) {
      return res.status(404).json({ message: "Nový vlastník nenalezen." });
    }

    await prisma.reservation.update({
      where: { id: reservationId },
      data: { userId: newOwner.id },
    });

    res.json({ message: "Přiřazeno." });
  } catch (error) {
    logger.error("RESERVATIONS", "Assign reservation error", { error: String(error), reservationId });
    res.status(500).json({ message: "Chyba." });
  }
});

export default router;
