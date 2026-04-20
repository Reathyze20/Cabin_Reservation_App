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

    const [upcomingReservations, activeReservation, departingTodayReservation, myNextReservation, nextFreeWeekend, lastStayReservation, myStaysThisYear, totalStaysThisMonth] = await Promise.all([
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
      findNextFreeWeekend(cabinId),
      // Last completed stay (ended before today)
      prisma.reservation.findFirst({
        where: { cabinId, dateTo: { lt: new Date(todayStr) }, status: "primary" },
        include: { user: { select: { username: true, color: true, animalIcon: true } } },
        orderBy: { dateTo: "desc" },
      }),
      // My stays this year (for stats)
      prisma.reservation.findMany({
        where: {
          cabinId,
          userId: req.user.userId,
          status: "primary",
          dateFrom: { gte: new Date(`${now.getFullYear()}-01-01`) },
          dateTo: { lte: new Date(todayStr) },
        },
        select: { dateFrom: true, dateTo: true },
      }),
      // Total stays this month
      prisma.reservation.count({
        where: {
          cabinId,
          status: "primary",
          dateFrom: { lte: new Date(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`) },
          dateTo: { gte: new Date(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`) },
        },
      }),
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
      lastStay: lastStayReservation ? {
        username: lastStayReservation.user.username,
        userColor: lastStayReservation.user.color,
        userAnimalIcon: lastStayReservation.user.animalIcon,
        from: lastStayReservation.dateFrom.toISOString().split("T")[0],
        to: lastStayReservation.dateTo.toISOString().split("T")[0],
        isCheckoutCompleted: lastStayReservation.isCheckoutCompleted,
        daysEmpty: Math.floor((new Date(todayStr).getTime() - lastStayReservation.dateTo.getTime()) / (1000 * 60 * 60 * 24)),
      } : null,
      stats: {
        myNightsThisYear: myStaysThisYear.reduce((sum, r) => {
          const nights = Math.max(0, Math.floor((r.dateTo.getTime() - r.dateFrom.getTime()) / (1000 * 60 * 60 * 24)));
          return sum + nights;
        }, 0),
        totalStaysThisMonth: totalStaysThisMonth,
      },
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

    const activeListFilter = { isResolved: false, isPantry: false, cabinId };
    const [pendingShoppingItems, totalPendingCount, totalItemsCount, essentialPendingItems] = await Promise.all([
      prisma.shoppingListItem.findMany({
        where: { purchased: false, status: { not: "purchased" }, list: activeListFilter },
        include: { list: { select: { id: true, name: true } } },
        orderBy: [{ isEssential: "desc" }, { createdAt: "asc" }],
        take: 6,
      }),
      prisma.shoppingListItem.count({
        where: { purchased: false, status: { not: "purchased" }, list: activeListFilter },
      }),
      prisma.shoppingListItem.count({
        where: { list: activeListFilter },
      }),
      prisma.shoppingListItem.findMany({
        where: { isEssential: true, purchased: false, status: { not: "purchased" }, list: activeListFilter },
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
      totalItemsCount,
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

// 3. Activation Route — first admin checklist summary
router.get("/activation", protect, requireCabin, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  try {
    if (req.user.role !== "admin") {
      return res.json({
        shouldShow: false,
        membersCount: 0,
        activeInviteCount: 0,
        reservationsCount: 0,
        shoppingListsCount: 0,
        completedCount: 0,
        totalCount: 3,
      });
    }

    const cabinId = req.user.cabinId!;
    const now = new Date();

    const [membersCount, reservationsCount, shoppingListsCount, inviteCandidates] = await Promise.all([
      prisma.user.count({
        where: { cabinId, isBanned: false },
      }),
      prisma.reservation.count({
        where: { cabinId },
      }),
      prisma.shoppingList.count({
        where: { cabinId, isPantry: false },
      }),
      prisma.inviteLink.findMany({
        where: {
          cabinId,
          expiresAt: { gt: now },
        },
        select: {
          maxUses: true,
          usedCount: true,
        },
      }),
    ]);

    const activeInviteCount = inviteCandidates.filter((invite) => invite.maxUses === null || invite.usedCount < invite.maxUses).length;
    const completedCount = [membersCount > 1, reservationsCount > 0, shoppingListsCount > 0].filter(Boolean).length;

    res.json({
      shouldShow: completedCount < 3,
      membersCount,
      activeInviteCount,
      reservationsCount,
      shoppingListsCount,
      completedCount,
      totalCount: 3,
    });
  } catch (error) {
    logger.error("DASHBOARD", "Get activation error", { error: String(error) });
    res.status(500).json({ message: "Chyba při načítání prvních kroků pro správce." });
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
      handoverNoteAuthor: appSettings?.handoverNoteAuthor ?? null,
      handoverNoteUpdatedAt: appSettings?.handoverNoteUpdatedAt?.toISOString() ?? null,
    });
  } catch (error) {
    logger.error("DASHBOARD", "Get notes error", { error: String(error) });
    res.status(500).json({ message: "Chyba při načítání nástěnky." });
  }
});

// 4. Reconstruction Route — dashboard summary
router.get("/reconstruction", protect, requireCabin, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  try {
    const cabinId = req.user!.cabinId!;

    const [activeItems, totalCount] = await Promise.all([
      prisma.reconstructionItem.findMany({
        where: { cabinId, status: { in: ["pending", "approved"] } },
        include: {
          createdBy: { select: { username: true } },
          votes: { select: { userId: true } },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 3,
      }),
      prisma.reconstructionItem.count({
        where: { cabinId, status: { in: ["pending", "approved"] } },
      }),
    ]);

    res.json({
      totalActiveCount: totalCount,
      items: activeItems.map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        status: item.status,
        votesCount: item.votes.length,
        createdBy: item.createdBy.username,
        deadline: item.deadline ? item.deadline.toISOString().split("T")[0] : null,
      })),
    });
  } catch (error) {
    logger.error("DASHBOARD", "Get reconstruction error", { error: String(error) });
    res.status(500).json({ message: "Chyba při načítání rekonstrukce." });
  }
});

// 5. Gallery Route — latest photos
router.get("/gallery", protect, requireCabin, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  try {
    const cabinId = req.user!.cabinId!;

    const latestPhotos = await prisma.galleryPhoto.findMany({
      where: { folder: { cabinId } },
      include: {
        uploadedBy: { select: { username: true } },
        folder: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    });

    res.json({
      photos: latestPhotos.map((p) => {
        const fileName = p.src.split("/uploads/")[1];
        return {
          id: p.id,
          thumb: fileName ? `/uploads/thumbs/${fileName}` : p.src,
          folderName: p.folder.name,
          uploadedBy: p.uploadedBy?.username ?? null,
          createdAt: p.createdAt.toISOString(),
        };
      }),
    });
  } catch (error) {
    logger.error("DASHBOARD", "Get gallery error", { error: String(error) });
    res.status(500).json({ message: "Chyba při načítání galerie." });
  }
});

export default router;
