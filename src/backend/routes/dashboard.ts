import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";

const router = Router();

// ─── Helper: Find next free weekend (Sat–Sun) ─────────────────────────
async function findNextFreeWeekend(): Promise<{ start: string; end: string } | null> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Pull all future primary reservations
  const futureReservations = await prisma.reservation.findMany({
    where: {
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
//                        GET DASHBOARD DATA
// ============================================================================
router.get("/", protect, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  try {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // 1) Nearest upcoming reservations (next 3)
    const upcomingReservations = await prisma.reservation.findMany({
      where: {
        dateFrom: { gte: new Date(todayStr) },
        status: "primary",
      },
      include: {
        user: {
          select: { username: true, color: true, animalIcon: true },
        },
      },
      orderBy: { dateFrom: "asc" },
      take: 5,
    });

    // 2) Currently active reservation (someone is at the cabin right now)
    const activeReservation = await prisma.reservation.findFirst({
      where: {
        dateFrom: { lte: new Date(todayStr) },
        dateTo: { gte: new Date(todayStr) },
        status: "primary",
      },
      include: {
        user: {
          select: { username: true, color: true, animalIcon: true },
        },
      },
    });

    // 2.5) Reservation ending today FOR THE CURRENT USER (Departure Mode)
    const departingTodayReservation = await prisma.reservation.findFirst({
      where: {
        userId: req.user.userId,
        dateTo: new Date(todayStr),
        status: "primary",
      },
      select: {
        handoverNote: true,
      }
    });

    // 3) Shopping widget — top 5 pending items across all non-resolved lists, essential first
    const pendingShoppingItems = await prisma.shoppingListItem.findMany({
      where: {
        purchased: false,
        status: { not: "purchased" },
        list: { isResolved: false, isPantry: false },
      },
      include: {
        list: { select: { id: true, name: true } },
      },
      orderBy: [
        { isEssential: "desc" },
        { createdAt: "asc" },
      ],
      take: 5,
    });

    // 3b) Total pending count (for "+X dalších" label)
    const totalPendingCount = await prisma.shoppingListItem.count({
      where: {
        purchased: false,
        status: { not: "purchased" },
        list: { isResolved: false, isPantry: false },
      },
    });

    // 4) Latest notes (last 3)
    const latestNotes = await prisma.note.findMany({
      include: {
        user: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    // 5) User's own next reservation
    const myNextReservation = await prisma.reservation.findFirst({
      where: {
        userId: req.user.userId,
        dateFrom: { gte: new Date(todayStr) },
      },
      orderBy: { dateFrom: "asc" },
    });

    // 6) Essential items warning — pending essential shopping items in unresolved lists
    const essentialPendingItems = await prisma.shoppingListItem.findMany({
      where: {
        isEssential: true,
        purchased: false,
        status: { not: "purchased" },
        list: { isResolved: false, isPantry: false },
      },
      select: { id: true, name: true },
      take: 10,
    });

    // 7) App settings (pinned handover note)
    const appSettings = await prisma.appSettings.findFirst();

    // 8) Next free weekend
    const nextFreeWeekend = await findNextFreeWeekend();

    res.json({
      activeReservation: activeReservation
        ? {
          id: activeReservation.id,
          username: activeReservation.user.username,
          userColor: activeReservation.user.color,
          userAnimalIcon: activeReservation.user.animalIcon,
          from: activeReservation.dateFrom.toISOString().split("T")[0],
          to: activeReservation.dateTo.toISOString().split("T")[0],
          purpose: activeReservation.purpose,
          handoverNote: activeReservation.handoverNote ?? null,
        }
        : null,
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
      myNextReservation: myNextReservation
        ? {
          from: myNextReservation.dateFrom.toISOString().split("T")[0],
          to: myNextReservation.dateTo.toISOString().split("T")[0],
          purpose: myNextReservation.purpose,
        }
        : null,
      departingToday: departingTodayReservation !== null && !departingTodayReservation.handoverNote,
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
      latestNotes: latestNotes.map((n) => ({
        id: n.id,
        username: n.user.username,
        message: n.message,
        createdAt: n.createdAt.toISOString(),
      })),
      pinnedHandoverNote: appSettings?.pinnedHandoverNote ?? null,
      nextFreeWeekend,
    });
  } catch (error) {
    logger.error("DASHBOARD", "Get dashboard data error", {
      error: String(error),
    });
    res.status(500).json({ message: "Chyba při načítání přehledu." });
  }
});

export default router;
