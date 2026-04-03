import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import { requireCabin } from "../../middleware/cabinMiddleware";
import { validate } from "../../validators/validate";
import { createReservationSchema, updateReservationSchema, upsertMonthlyNoteSchema, deleteReservationSchema } from "../../validators/schemas";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";

const router = Router();

// ============================================================================
//                        GET ALL RESERVATIONS
// ============================================================================
router.get("/", protect, requireCabin, async (req: Request, res: Response) => {
  try {
    const cabinId = req.user!.cabinId!;
    const [reservations, availabilities] = await Promise.all([
      prisma.reservation.findMany({
        where: { cabinId },
        include: {
          user: {
            select: {
              username: true,
              color: true,
              animalIcon: true,
            },
          },
        },
      }),
      prisma.userAvailability.findMany({
        where: { cabinId },
        include: {
          user: {
            select: { username: true, color: true, animalIcon: true },
          },
        },
        orderBy: { startDate: "asc" },
      }),
    ]);

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
      isCheckoutCompleted: r.isCheckoutCompleted,
      checkoutCompletedBy: r.checkoutCompletedBy,
      checkoutCompletedAt: r.checkoutCompletedAt?.toISOString() ?? null,
    }));

    const availResult = availabilities.map((a) => ({
      id: a.id,
      userId: a.userId,
      username: a.user.username,
      userColor: a.user.color,
      userAnimalIcon: a.user.animalIcon,
      startDate: a.startDate.toISOString().split("T")[0],
      endDate: a.endDate.toISOString().split("T")[0],
    }));

    res.json({ reservations: result, availabilities: availResult });
  } catch (error) {
    logger.error("RESERVATIONS", "Get reservations error", { error: String(error) });
    res.status(500).json({ message: "Chyba." });
  }
});

// ============================================================================
//                         CREATE RESERVATION
// ============================================================================
router.post("/", protect, requireCabin, validate(createReservationSchema), async (req: Request, res: Response) => {
  const { from, to, purpose, notes, handoverNote, status: requestedStatus } = req.body;

  try {
    const newStart = new Date(from);
    const newEnd = new Date(to);
    const cabinId = req.user!.cabinId!;

    // Check for collision with PRIMARY reservations
    const collision = await prisma.reservation.findFirst({
      where: {
        cabinId,
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
        userId: req.user!.userId,
        cabinId,
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
//                        MONTHLY NOTE
// ============================================================================

// GET — monthly note for a given year/month
router.get("/monthly-note", protect, requireCabin, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Neautorizováno." });
    const cabinId = req.user.cabinId!;
    const year = parseInt(req.query.year as string, 10);
    const month = parseInt(req.query.month as string, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: "Neplatné parametry year/month." });
    }

    const note = await prisma.monthlyNote.findUnique({
      where: { cabinId_year_month: { cabinId, year, month } },
      select: {
        id: true,
        year: true,
        month: true,
        text: true,
        updatedAt: true,
        updatedBy: { select: { username: true } },
      },
    });

    if (!note) return res.json(null);

    res.json({
      id: note.id,
      year: note.year,
      month: note.month,
      text: note.text,
      updatedBy: note.updatedBy.username,
      updatedAt: note.updatedAt.toISOString(),
    });
  } catch (error) {
    logger.error("MONTHLY_NOTE", "Get monthly note error", { error: String(error) });
    res.status(500).json({ message: "Chyba při načítání poznámky." });
  }
});

// PUT — upsert monthly note
router.put("/monthly-note", protect, requireCabin, validate(upsertMonthlyNoteSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Neautorizováno." });
    if (req.user.role === "guest") return res.status(403).json({ message: "Hosté nemohou upravovat poznámky." });

    const cabinId = req.user.cabinId!;
    const { year: y, month: m, text } = req.body as { year: number; month: number; text: string };

    const trimmed = text.trim();

    // If text is empty, delete the note
    if (!trimmed) {
      await prisma.monthlyNote.deleteMany({
        where: { cabinId, year: y, month: m },
      });
      return res.json({ message: "Poznámka smazána." });
    }

    const note = await prisma.monthlyNote.upsert({
      where: { cabinId_year_month: { cabinId, year: y, month: m } },
      create: {
        cabinId,
        year: y,
        month: m,
        text: trimmed,
        updatedById: req.user.userId,
      },
      update: {
        text: trimmed,
        updatedById: req.user.userId,
      },
      select: {
        id: true,
        year: true,
        month: true,
        text: true,
        updatedAt: true,
        updatedBy: { select: { username: true } },
      },
    });

    res.json({
      id: note.id,
      year: note.year,
      month: note.month,
      text: note.text,
      updatedBy: note.updatedBy.username,
      updatedAt: note.updatedAt.toISOString(),
    });
  } catch (error) {
    logger.error("MONTHLY_NOTE", "Upsert monthly note error", { error: String(error) });
    res.status(500).json({ message: "Chyba při ukládání poznámky." });
  }
});

// ============================================================================
//                        UPDATE RESERVATION
// ============================================================================
router.put("/:id", protect, requireCabin, validate(updateReservationSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { purpose, notes, handoverNote, status, from, to } = req.body;

  try {
    const reservation = await prisma.reservation.findFirst({
      where: { id, cabinId: req.user!.cabinId },
    });

    if (!reservation) {
      return res.status(404).json({ message: "Nenalezeno." });
    }

    if (reservation.userId !== req.user!.userId && req.user!.role !== "admin") {
      return res.status(403).json({ message: "Bez oprávnění." });
    }

    // Determine effective dates and status after update
    const effectiveFrom = from ? new Date(from) : reservation.dateFrom;
    const effectiveTo = to ? new Date(to) : reservation.dateTo;
    const effectiveStatus = status ?? reservation.status;

    // If the result would be a primary reservation, check for collisions with OTHER primary reservations
    if (effectiveStatus === "primary") {
      const collision = await prisma.reservation.findFirst({
        where: {
          id: { not: id }, // exclude self
          cabinId: req.user!.cabinId,
          status: "primary",
          dateFrom: { lte: effectiveTo },
          dateTo: { gte: effectiveFrom },
        },
      });
      if (collision) {
        return res.status(409).json({
          message: "V tomto termínu již existuje potvrzená rezervace. Nastav stav jako záložní.",
        });
      }
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
router.post("/delete", protect, requireCabin, validate(deleteReservationSchema), async (req: Request, res: Response) => {
  const { id } = req.body;

  try {
    const reservation = await prisma.reservation.findFirst({
      where: { id, cabinId: req.user!.cabinId },
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

    if (reservation.userId !== req.user!.userId && req.user!.role !== "admin") {
      return res.status(403).json({ message: "Bez oprávnění." });
    }

    const fromStr = reservation.dateFrom.toISOString().split("T")[0];
    const toStr = reservation.dateTo.toISOString().split("T")[0];
    const ownerUsername = reservation.user.username;
    const watcherUsers = reservation.watchers.map((w) => w.user);

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
            cabinId: req.user!.cabinId!,
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
router.get("/:id/watch", protect, requireCabin, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno." });
  const { id: reservationId } = req.params;
  try {
    // Verify reservation belongs to user's cabin
    const reservation = await prisma.reservation.findFirst({
      where: { id: reservationId, cabinId: req.user.cabinId },
    });
    if (!reservation) {
      return res.status(404).json({ message: "Rezervace nenalezena." });
    }

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
router.post("/:id/watch", protect, requireCabin, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno." });
  const { id: reservationId } = req.params;
  try {
    const reservation = await prisma.reservation.findFirst({
      where: { id: reservationId, cabinId: req.user.cabinId },
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
router.delete("/:id/watch", protect, requireCabin, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno." });
  const { id: reservationId } = req.params;
  try {
    // Verify reservation belongs to user's cabin
    const reservation = await prisma.reservation.findFirst({
      where: { id: reservationId, cabinId: req.user.cabinId },
    });
    if (!reservation) {
      return res.status(404).json({ message: "Rezervace nenalezena." });
    }

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
router.post("/:reservationId/assign", protect, requireCabin, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Pouze admin." });
  }

  const { reservationId } = req.params;
  const { newOwnerId } = req.body;

  try {
    // Verify reservation belongs to user's cabin
    const reservation = await prisma.reservation.findFirst({
      where: { id: reservationId, cabinId: req.user.cabinId },
    });
    if (!reservation) {
      return res.status(404).json({ message: "Rezervace nenalezena." });
    }

    // Verify new owner belongs to same cabin
    const newOwner = await prisma.user.findFirst({
      where: { id: newOwnerId, cabinId: req.user.cabinId },
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

// ============================================================================
//                    USER AVAILABILITY (Osobní volno)
// ============================================================================

// GET all availabilities
router.get("/availabilities", protect, requireCabin, async (req: Request, res: Response) => {
  try {
    const cabinId = req.user!.cabinId!;
    const availabilities = await prisma.userAvailability.findMany({
      where: { cabinId },
      include: {
        user: {
          select: { username: true, color: true, animalIcon: true },
        },
      },
      orderBy: { startDate: "asc" },
    });

    res.json(
      availabilities.map((a) => ({
        id: a.id,
        userId: a.userId,
        username: a.user.username,
        userColor: a.user.color,
        userAnimalIcon: a.user.animalIcon,
        startDate: a.startDate.toISOString().split("T")[0],
        endDate: a.endDate.toISOString().split("T")[0],
      }))
    );
  } catch (error) {
    logger.error("AVAILABILITY", "Get availabilities error", { error: String(error) });
    res.status(500).json({ message: "Chyba při načítání volna." });
  }
});

// POST — create availability
router.post("/availabilities", protect, requireCabin, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno." });

  const { startDate, endDate } = req.body;
  if (!startDate || !endDate) {
    return res.status(400).json({ message: "Chybí startDate nebo endDate." });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ message: "Neplatné datum." });
  }
  if (end < start) {
    return res.status(400).json({ message: "Konec nemůže být před začátkem." });
  }

  try {
    const created = await prisma.userAvailability.create({
      data: {
        userId: req.user.userId,
        cabinId: req.user.cabinId!,
        startDate: start,
        endDate: end,
      },
      include: {
        user: {
          select: { username: true, color: true, animalIcon: true },
        },
      },
    });

    res.status(201).json({
      id: created.id,
      userId: created.userId,
      username: created.user.username,
      userColor: created.user.color,
      userAnimalIcon: created.user.animalIcon,
      startDate: created.startDate.toISOString().split("T")[0],
      endDate: created.endDate.toISOString().split("T")[0],
    });
  } catch (error) {
    logger.error("AVAILABILITY", "Create availability error", { error: String(error) });
    res.status(500).json({ message: "Chyba při ukládání volna." });
  }
});

// PATCH — update availability
router.patch("/availabilities/:id", protect, requireCabin, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno." });

  const { id } = req.params;
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ message: "Chybí startDate nebo endDate." });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ message: "Neplatné datum." });
  }
  if (end < start) {
    return res.status(400).json({ message: "Konec nemůže být před začátkem." });
  }

  try {
    const existing = await prisma.userAvailability.findFirst({ where: { id, cabinId: req.user!.cabinId } });
    if (!existing) {
      return res.status(404).json({ message: "Záznam nenalezen." });
    }
    if (existing.userId !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Bez oprávnění." });
    }

    const updated = await prisma.userAvailability.update({
      where: { id },
      data: { startDate: start, endDate: end },
      include: {
        user: {
          select: { username: true, color: true, animalIcon: true },
        },
      },
    });

    res.json({
      id: updated.id,
      userId: updated.userId,
      username: updated.user.username,
      userColor: updated.user.color,
      userAnimalIcon: updated.user.animalIcon,
      startDate: updated.startDate.toISOString().split("T")[0],
      endDate: updated.endDate.toISOString().split("T")[0],
    });
  } catch (error) {
    logger.error("AVAILABILITY", "Update availability error", { error: String(error) });
    res.status(500).json({ message: "Chyba při úpravě volna." });
  }
});

// DELETE — remove availability
router.delete("/availabilities/:id", protect, requireCabin, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno." });

  const { id } = req.params;

  try {
    const existing = await prisma.userAvailability.findFirst({ where: { id, cabinId: req.user!.cabinId } });
    if (!existing) {
      return res.status(404).json({ message: "Záznam nenalezen." });
    }
    if (existing.userId !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Bez oprávnění." });
    }

    await prisma.userAvailability.delete({ where: { id } });
    res.json({ message: "Volno smazáno." });
  } catch (error) {
    logger.error("AVAILABILITY", "Delete availability error", { error: String(error) });
    res.status(500).json({ message: "Chyba při mazání volna." });
  }
});
// ============================================================================
//                 PATCH /:id/checkout — Complete departure checklist
// ============================================================================
router.patch("/:id/checkout", protect, requireCabin, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Neautorizováno" });

    const { id } = req.params;
    const cabinId = req.user.cabinId!;

    // Find the reservation, ensure it belongs to the same cabin
    const reservation = await prisma.reservation.findFirst({
      where: { id, cabinId },
      select: {
        id: true,
        isCheckoutCompleted: true,
        userId: true,
        user: { select: { username: true } },
      },
    });

    if (!reservation) {
      return res.status(404).json({ message: "Rezervace nenalezena." });
    }

    // Already completed — return idempotent response with current state
    if (reservation.isCheckoutCompleted) {
      const full = await prisma.reservation.findUnique({
        where: { id },
        select: {
          isCheckoutCompleted: true,
          checkoutCompletedBy: true,
          checkoutCompletedAt: true,
        },
      });
      // Resolve username of the person who completed it
      let completedByUsername: string | null = null;
      if (full?.checkoutCompletedBy) {
        const u = await prisma.user.findUnique({
          where: { id: full.checkoutCompletedBy },
          select: { username: true },
        });
        completedByUsername = u?.username ?? null;
      }
      return res.json({
        message: "Odjezdový checklist byl již dokončen.",
        isCheckoutCompleted: true,
        checkoutCompletedBy: full?.checkoutCompletedBy ?? null,
        checkoutCompletedByUsername: completedByUsername,
        checkoutCompletedAt: full?.checkoutCompletedAt?.toISOString() ?? null,
      });
    }

    // Mark checkout as completed
    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        isCheckoutCompleted: true,
        checkoutCompletedBy: req.user.userId,
        checkoutCompletedAt: new Date(),
      },
      select: {
        isCheckoutCompleted: true,
        checkoutCompletedBy: true,
        checkoutCompletedAt: true,
      },
    });

    logger.info("RESERVATIONS", "Checkout completed", {
      reservationId: id,
      completedBy: req.user.userId,
      cabinId,
    });

    res.json({
      message: "Odjezdový checklist dokončen.",
      isCheckoutCompleted: updated.isCheckoutCompleted,
      checkoutCompletedBy: updated.checkoutCompletedBy,
      checkoutCompletedByUsername: req.user.username,
      checkoutCompletedAt: updated.checkoutCompletedAt?.toISOString() ?? null,
    });
  } catch (error) {
    logger.error("RESERVATIONS", "Checkout completion error", { error: String(error) });
    res.status(500).json({ message: "Nepodařilo se uložit odjezdový checklist." });
  }
});

// ============================================================================
//                 GET /:id/checkout — Get checkout status for a reservation
// ============================================================================
router.get("/:id/checkout", protect, requireCabin, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Neautorizováno" });

    const { id } = req.params;
    const cabinId = req.user.cabinId!;

    const reservation = await prisma.reservation.findFirst({
      where: { id, cabinId },
      select: {
        isCheckoutCompleted: true,
        checkoutCompletedBy: true,
        checkoutCompletedAt: true,
      },
    });

    if (!reservation) {
      return res.status(404).json({ message: "Rezervace nenalezena." });
    }

    // Resolve username
    let completedByUsername: string | null = null;
    if (reservation.checkoutCompletedBy) {
      const u = await prisma.user.findUnique({
        where: { id: reservation.checkoutCompletedBy },
        select: { username: true },
      });
      completedByUsername = u?.username ?? null;
    }

    res.json({
      isCheckoutCompleted: reservation.isCheckoutCompleted,
      checkoutCompletedBy: reservation.checkoutCompletedBy,
      checkoutCompletedByUsername: completedByUsername,
      checkoutCompletedAt: reservation.checkoutCompletedAt?.toISOString() ?? null,
    });
  } catch (error) {
    logger.error("RESERVATIONS", "Get checkout status error", { error: String(error) });
    res.status(500).json({ message: "Chyba při načítání stavu checklistu." });
  }
});

export default router;