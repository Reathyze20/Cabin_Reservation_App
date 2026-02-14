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
          select: { username: true, color: true },
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
          select: { username: true, color: true },
        },
      },
    });

    // 3) Unpurchased shopping items count
    const unpurchasedItems = await prisma.shoppingListItem.findMany({
      where: { purchased: false },
      include: {
        addedBy: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // 4) Latest notes (last 3)
    const latestNotes = await prisma.note.findMany({
      include: {
        user: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    // 5) Recent diary entries (last 2)
    const recentDiary = await prisma.diaryEntry.findMany({
      include: {
        author: { select: { username: true } },
        folder: { select: { name: true } },
      },
      orderBy: { entryDate: "desc" },
      take: 2,
    });

    // 6) Stats
    const totalReservations = await prisma.reservation.count();
    const totalPhotos = await prisma.galleryPhoto.count();
    const totalDiaryEntries = await prisma.diaryEntry.count();
    const unpurchasedCount = await prisma.shoppingListItem.count({
      where: { purchased: false },
    });

    // 7) User's own next reservation
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
            from: activeReservation.dateFrom.toISOString().split("T")[0],
            to: activeReservation.dateTo.toISOString().split("T")[0],
            purpose: activeReservation.purpose,
          }
        : null,
      upcomingReservations: upcomingReservations.map((r) => ({
        id: r.id,
        userId: r.userId,
        username: r.user.username,
        userColor: r.user.color,
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
      unpurchasedItems: unpurchasedItems.map((item) => ({
        id: item.id,
        name: item.name,
        addedBy: item.addedBy.username,
      })),
      latestNotes: latestNotes.map((n) => ({
        id: n.id,
        username: n.user.username,
        message: n.message,
        createdAt: n.createdAt.toISOString(),
      })),
      recentDiary: recentDiary.map((d) => ({
        id: d.id,
        folderName: d.folder.name,
        author: d.author.username,
        date: d.entryDate.toISOString().split("T")[0],
        content: d.content.substring(0, 150),
      })),
      stats: {
        totalReservations,
        totalPhotos,
        totalDiaryEntries,
        unpurchasedCount,
      },
    });
  } catch (error) {
    logger.error("DASHBOARD", "Get dashboard data error", {
      error: String(error),
    });
    res.status(500).json({ message: "Chyba při načítání přehledu." });
  }
});

export default router;
