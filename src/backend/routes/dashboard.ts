import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";

const router = Router();

// ─── Helper: Find next free weekend (Fri–Sun) ─────────────────────────
async function findNextFreeWeekend(): Promise<{ start: string; end: string } | null> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Find next Friday (or today if already Friday)
  let friday = new Date(today);
  const dayOfWeek = friday.getDay(); // 0=Sun, 5=Fri
  const daysUntilFri = (5 - dayOfWeek + 7) % 7 || 7; // always move forward
  // If today is Friday and it's still morning, allow this weekend
  if (dayOfWeek === 5) {
    // Use this Friday
  } else {
    friday.setDate(friday.getDate() + daysUntilFri);
  }

  // Search up to 26 weeks (~6 months)
  const MAX_WEEKS = 26;

  for (let i = 0; i < MAX_WEEKS; i++) {
    const weekendStart = new Date(friday);
    const weekendEnd = new Date(friday);
    weekendEnd.setDate(weekendEnd.getDate() + 2); // Sunday

    const startStr = weekendStart.toISOString().split("T")[0];
    const endStr = weekendEnd.toISOString().split("T")[0];

    // Check for overlapping reservations:
    // A reservation overlaps this weekend if:
    //   reservation.dateFrom < weekendEnd+1day AND reservation.dateTo > weekendStart
    // Since dates are date-only, "dateTo = Friday" means they leave Friday,
    // so the cabin is free from Friday. We check dateTo > Friday (strictly).
    const conflict = await prisma.reservation.findFirst({
      where: {
        status: "primary",
        dateFrom: { lte: new Date(endStr) },
        dateTo: { gt: new Date(startStr) },
      },
      select: { id: true },
    });

    if (!conflict) {
      return { start: startStr, end: endStr };
    }

    // Move to next Friday
    friday.setDate(friday.getDate() + 7);
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
      upcomingReservations: upcomingReservations.map((r) => ({
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
