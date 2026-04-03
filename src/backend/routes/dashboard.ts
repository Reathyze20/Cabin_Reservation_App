import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import { requireCabin } from "../../middleware/cabinMiddleware";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";

const router = Router();

// ─── Helper: Find next free weekend (Sat–Sun) ─────────────────────────
async function findNextFreeWeekend(cabinId: string): Promise<{ start: string; end: string } | null> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Pull all future primary reservations
  const futureReservations = await prisma.reservation.findMany({
    where: {
      cabinId,
      status: "primary",
      dateTo: { gte: today },
    },
    select: { dateFrom: true, dateTo: true },
  });

  // Build Set of occupied YYYY-MM-DD strings
  const occupiedDates = new Set<string>();
  for (const r of futureReservations) {
    const cur = new Date(r.dateFrom);
    cur.setHours(0, 0, 0, 0);
    const end = new Date(r.dateTo);
    end.setHours(0, 0, 0, 0);
    while (cur <= end) {
      occupiedDates.add(cur.toISOString().split("T")[0]);
      cur.setDate(cur.getDate() + 1);
    }
  }

  // Advance to next Saturday (if today is Saturday, start here)
  const candidate = new Date(today);
  while (candidate.getDay() !== 6) {
    candidate.setDate(candidate.getDate() + 1);
  }

  // Check up to 26 weekends (~6 months)
  for (let i = 0; i < 26; i++) {
    const satStr = candidate.toISOString().split("T")[0];
    const sunday = new Date(candidate);
    sunday.setDate(sunday.getDate() + 1);
    const sunStr = sunday.toISOString().split("T")[0];

    if (!occupiedDates.has(satStr) && !occupiedDates.has(sunStr)) {
      return { start: satStr, end: sunStr };
    }
    candidate.setDate(candidate.getDate() + 7);
  }

  return null; // No free weekend in next 6 months
}

// ============================================================================
//                        GET DASHBOARD DATA (GRANULAR)
// ============================================================================

// 1. Reservations Route
router.get("/reservations", protect, requireCabin, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  try {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const cabinId = req.user!.cabinId!;

    const [upcomingReservations, activeReservation, departingTodayReservation, myNextReservation, nextFreeWeekend] = await Promise.all([
      prisma.reservation.findMany({
        where: { cabinId, dateFrom: { gte: new Date(todayStr) }, status: "primary" },
        include: { user: { select: { username: true, color: true, animalIcon: true } } },
        orderBy: { dateFrom: "asc" },
        take: 5,
      }),
      prisma.reservation.findFirst({
        where: { cabinId, dateFrom: { lte: new Date(todayStr) }, dateTo: { gte: new Date(todayStr) }, status: "primary" },
        include: { user: { select: { username: true, color: true, animalIcon: true } } },
      }),
      prisma.reservation.findFirst({
        where: { cabinId, userId: req.user.userId, dateTo: new Date(todayStr), status: "primary" },
        select: { handoverNote: true }
      }),
      prisma.reservation.findFirst({
        where: { cabinId, userId: req.user.userId, dateFrom: { gte: new Date(todayStr) } },
        orderBy: { dateFrom: "asc" },
      }),
      findNextFreeWeekend(cabinId)
    ]);

    res.json({
      activeReservation: activeReservation ? {
        id: activeReservation.id,
        username: activeReservation.user.username,
        userColor: activeReservation.user.color,
        userAnimalIcon: activeReservation.user.animalIcon,
        from: activeReservation.dateFrom.toISOString().split("T")[0],
        to: activeReservation.dateTo.toISOString().split("T")[0],
        purpose: activeReservation.purpose,
        handoverNote: activeReservation.handoverNote ?? null,
        isCheckoutCompleted: activeReservation.isCheckoutCompleted,
      } : null,
      upcomingReservations: upcomingReservations
        .filter((r) => r.dateTo >= r.dateFrom)
        .map((r) => ({
          id: r.id,
          userId: r.userId,
          username: r.user.username,
          userColor: r.user.color,
          userAnimalIcon: r.user.animalIcon,
          from: r.dateFrom.toISOString().split("T")[0],
          to: r.dateTo.toISOString().split("T")[0],
          purpose: r.purpose,
          status: r.status,
        })),
      myNextReservation: myNextReservation ? {
        from: myNextReservation.dateFrom.toISOString().split("T")[0],
        to: myNextReservation.dateTo.toISOString().split("T")[0],
        purpose: myNextReservation.purpose,
      } : null,
      departingToday: departingTodayReservation !== null && !departingTodayReservation.handoverNote,
      nextFreeWeekend,
    });
  } catch (error) {
    logger.error("DASHBOARD", "Get reservations error", { error: String(error) });
    res.status(500).json({ message: "Chyba při načítání rezervací." });
  }
});

// 2. Shopping Route
router.get("/shopping", protect, requireCabin, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  try {
    const cabinId = req.user!.cabinId!;

    const [pendingShoppingItems, totalPendingCount, essentialPendingItems] = await Promise.all([
      prisma.shoppingListItem.findMany({
        where: { purchased: false, status: { not: "purchased" }, list: { isResolved: false, isPantry: false, cabinId } },
        include: { list: { select: { id: true, name: true } } },
        orderBy: [{ isEssential: "desc" }, { createdAt: "asc" }],
        take: 5,
      }),
      prisma.shoppingListItem.count({
        where: { purchased: false, status: { not: "purchased" }, list: { isResolved: false, isPantry: false, cabinId } },
      }),
      prisma.shoppingListItem.findMany({
        where: { isEssential: true, purchased: false, status: { not: "purchased" }, list: { isResolved: false, isPantry: false, cabinId } },
        select: { id: true, name: true },
        take: 10,
      })
    ]);

    res.json({
      pendingShoppingItems: pendingShoppingItems.map((i) => ({
        id: i.id,
        name: i.name,
        isEssential: i.isEssential,
        listId: i.listId,
        listName: i.list?.name ?? null,
      })),
      totalPendingShoppingCount: totalPendingCount,
      essentialWarning: essentialPendingItems.length > 0 ? {
        count: essentialPendingItems.length,
        items: essentialPendingItems.map((i) => ({ id: i.id, name: i.name })),
      } : null,
    });
  } catch (error) {
    logger.error("DASHBOARD", "Get shopping error", { error: String(error) });
    res.status(500).json({ message: "Chyba při načítání nákupů." });
  }
});

// 3. Notes / Handover Route
router.get("/notes", protect, requireCabin, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  try {
    const cabinId = req.user!.cabinId!;

    const [latestNotes, appSettings] = await Promise.all([
      prisma.note.findMany({
        where: { cabinId },
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      prisma.appSettings.findUnique({
        where: { id: `cabin_${cabinId}` },
      })
    ]);

    res.json({
      latestNotes: latestNotes.map((n) => ({
        id: n.id,
        username: n.user.username,
        message: n.message,
        createdAt: n.createdAt.toISOString(),
      })),
      pinnedHandoverNote: appSettings?.pinnedHandoverNote ?? null,
    });
  } catch (error) {
    logger.error("DASHBOARD", "Get notes error", { error: String(error) });
    res.status(500).json({ message: "Chyba při načítání nástěnky." });
  }
});

export default router;
