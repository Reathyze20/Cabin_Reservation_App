import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";

const router = Router();

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

    // 3) Shopping widget — newest unresolved list with progress + up to 3 pending items
    const latestList = await prisma.shoppingList.findFirst({
      where: { isResolved: false },
      include: { items: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
    });

    const shoppingListWidget = latestList
      ? {
          id: latestList.id,
          name: latestList.name,
          pendingItems: latestList.items
            .filter((i) => !i.purchased)
            .slice(0, 3)
            .map((i) => ({ id: i.id, name: i.name })),
          totalCount: latestList.items.length,
          doneCount: latestList.items.filter((i) => i.purchased).length,
        }
      : null;

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
      shoppingListWidget,
      latestNotes: latestNotes.map((n) => ({
        id: n.id,
        username: n.user.username,
        message: n.message,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error("DASHBOARD", "Get dashboard data error", {
      error: String(error),
    });
    res.status(500).json({ message: "Chyba při načítání přehledu." });
  }
});

export default router;
