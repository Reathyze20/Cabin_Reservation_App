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
            animalIcon: true,
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
      handoverNote: r.handoverNote,
      status: r.status,
      userColor: r.user.color,
      userAnimalIcon: r.user.animalIcon,
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

  const { from, to, purpose, notes, handoverNote, status: requestedStatus } = req.body;

  if (!from || !to) {
    return res.status(400).json({ message: "Chybí data." });
  }

  try {
    const newStart = new Date(from);
    const newEnd = new Date(to);

    // Check for collision with PRIMARY reservations
    const collision = await prisma.reservation.findFirst({
      where: {
        status: "primary",
        OR: [
          {
            dateFrom: { lte: newEnd },
            dateTo: { gte: newStart },
          },
        ],
      },
    });

    let finalStatus = "primary";
    if (requestedStatus === "soft") {
      finalStatus = "soft";
    }
    if (collision) {
      finalStatus = "backup";
    }

    const newReservation = await prisma.reservation.create({
      data: {
        userId: req.user.userId,
        dateFrom: newStart,
        dateTo: newEnd,
        purpose,
        notes,
        handoverNote,
        status: finalStatus,
      },
      include: {
        user: {
          select: {
            username: true,
            color: true,
            animalIcon: true,
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
      handoverNote: newReservation.handoverNote,
      status: newReservation.status,
      userColor: newReservation.user.color,
      userAnimalIcon: newReservation.user.animalIcon,
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
  const { purpose, notes, handoverNote, status, from, to } = req.body;

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
        ...(handoverNote !== undefined && { handoverNote }),
        ...(status && { status }),
      },
      include: {
        user: {
          select: {
            username: true,
            color: true,
            animalIcon: true,
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
      handoverNote: updated.handoverNote,
      status: updated.status,
      userColor: updated.user.color,
      userAnimalIcon: updated.user.animalIcon,
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
      include: {
        user: { select: { username: true } },
        // Načteme hlidáče PŘED smazáním (onDelete: Cascade je smaže automaticky)
        watchers: {
          include: {
            user: { select: { id: true, username: true } },
          },
        },
      },
    });

    if (!reservation) {
      return res.status(404).json({ message: "Nenalezeno." });
    }

    if (reservation.userId !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Bez oprávnění." });
    }

    // Sestavit data pro notifikace PRZED smazáním
    const fromStr = reservation.dateFrom.toISOString().split("T")[0];
    const toStr   = reservation.dateTo.toISOString().split("T")[0];
    const ownerUsername = reservation.user.username;
    const watcherUsers  = reservation.watchers.map((w) => w.user);

    // Smazat rezervaci (watchers se smažou kaskádou)
    await prisma.reservation.delete({ where: { id } });

    // ── Notifikace sledovatelů přes hlavní nástěnku ──────────────────────
    if (watcherUsers.length > 0) {
      const notifyPromises = watcherUsers.map((watcher) => {
        const message =
          `🐕 Hldácí pes: Rezervace uživatele **${ownerUsername}** ` +
          `(${fromStr} → ${toStr}) byla právě **zrušena**. ` +
          `Termín je nyní volný — můžeš si ho zarezervovat! 🏕️`;

        return prisma.note.create({
          data: {
            message,
            userId: watcher.id,
            // threadId: null = hlavní nástěnka
          },
        });
      });

      await Promise.allSettled(notifyPromises);

      logger.info("WATCHER", "Watchers notified via notes", {
        reservationId: id,
        notifiedCount: watcherUsers.length,
        watchers: watcherUsers.map((w) => w.username),
      });
    }

    res.json({ message: "Smazáno." });
  } catch (error) {
    logger.error("RESERVATIONS", "Delete reservation error", { error: String(error), id });
    res.status(500).json({ message: "Chyba." });
  }
});

// ============================================================================
//        WATCH: GET /:id/watch — zjistit, zda aktuální user hlídá
// ============================================================================
router.get("/:id/watch", protect, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno." });
  const { id: reservationId } = req.params;
  try {
    const watcher = await prisma.reservationWatcher.findUnique({
      where: {
        userId_reservationId: {
          userId: req.user.userId,
          reservationId,
        },
      },
    });
    res.json({ watching: !!watcher });
  } catch (err) {
    logger.error("WATCHER", "Watch status error", { error: String(err) });
    res.status(500).json({ message: "Chyba." });
  }
});

// ============================================================================
//        WATCH: POST /:id/watch — přihlásit hlídání
// ============================================================================
router.post("/:id/watch", protect, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno." });
  const { id: reservationId } = req.params;
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { user: { select: { username: true } } },
    });
    if (!reservation) {
      return res.status(404).json({ message: "Rezervace nenalezena." });
    }
    if (reservation.userId === req.user.userId) {
      return res.status(400).json({ message: "Nemůžete hlídat vlastní rezervaci." });
    }
    await prisma.reservationWatcher.upsert({
      where: {
        userId_reservationId: {
          userId: req.user.userId,
          reservationId,
        },
      },
      update: {},
      create: { userId: req.user.userId, reservationId },
    });
    logger.info("WATCHER", "Watch added", { watcherId: req.user.userId, reservationId });
    res.status(201).json({
      watching: true,
      message: `Hlídáš rezervaci uživatele ${reservation.user.username}.`,
    });
  } catch (err) {
    logger.error("WATCHER", "Watch error", { error: String(err), reservationId });
    res.status(500).json({ message: "Chyba při přihlášování hlídání." });
  }
});

// ============================================================================
//        WATCH: DELETE /:id/watch — odhlásit hlídání
// ============================================================================
router.delete("/:id/watch", protect, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno." });
  const { id: reservationId } = req.params;
  try {
    await prisma.reservationWatcher.deleteMany({
      where: { userId: req.user.userId, reservationId },
    });
    res.json({ watching: false, message: "Hlídání zrušeno." });
  } catch (err) {
    logger.error("WATCHER", "Unwatch error", { error: String(err) });
    res.status(500).json({ message: "Chyba při rušení hlídání." });
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
