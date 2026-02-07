import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import prisma from "../../utils/prisma";

const router = Router();

// ============================================================================
//                      GET ALL RECONSTRUCTION ITEMS
// ============================================================================
router.get("/", protect, async (req: Request, res: Response) => {
  try {
    const items = await prisma.reconstructionItem.findMany({
      include: {
        createdBy: {
          select: {
            username: true,
          },
        },
        votes: {
          include: {
            user: {
              select: {
                id: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formatted = items.map((item) => ({
      id: item.id,
      category: item.category,
      title: item.title,
      description: item.description,
      link: item.link,
      cost: item.cost ? parseFloat(item.cost.toString()) : undefined,
      status: item.status,
      votes: item.votes.map((v) => v.userId),
      createdBy: item.createdBy.username,
      createdAt: item.createdAt.toISOString(),
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Get reconstruction items error:", error);
    res.status(500).json({ message: "Chyba při načítání dat." });
  }
});

// ============================================================================
//                      CREATE RECONSTRUCTION ITEM
// ============================================================================
router.post("/", protect, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  const { category, title, description, link, cost, status } = req.body;

  if (!category || !title) {
    return res.status(400).json({ message: "Chybí povinné údaje (kategorie, název)." });
  }

  try {
    const newItem = await prisma.reconstructionItem.create({
      data: {
        category,
        title,
        description: description || "",
        link: link || undefined,
        cost: cost ? parseFloat(cost) : undefined,
        status: status || "pending",
        createdById: req.user.userId,
      },
      include: {
        createdBy: {
          select: {
            username: true,
          },
        },
      },
    });

    res.status(201).json({
      id: newItem.id,
      category: newItem.category,
      title: newItem.title,
      description: newItem.description,
      link: newItem.link,
      cost: newItem.cost ? parseFloat(newItem.cost.toString()) : undefined,
      status: newItem.status,
      votes: [],
      createdBy: newItem.createdBy.username,
      createdAt: newItem.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Create reconstruction item error:", error);
    res.status(500).json({ message: "Chyba při ukládání." });
  }
});

// ============================================================================
//                      DELETE RECONSTRUCTION ITEM
// ============================================================================
router.delete("/:id", protect, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  const { id } = req.params;

  try {
    await prisma.reconstructionItem.delete({
      where: { id },
    });

    res.json({ message: "Smazáno." });
  } catch (error) {
    console.error("Delete reconstruction item error:", error);
    res.status(500).json({ message: "Chyba." });
  }
});

// ============================================================================
//                          TOGGLE VOTE
// ============================================================================
router.patch("/:id/vote", protect, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  const { id } = req.params;

  try {
    const existingVote = await prisma.reconstructionVote.findUnique({
      where: {
        itemId_userId: {
          itemId: id,
          userId: req.user.userId,
        },
      },
    });

    if (existingVote) {
      // Remove vote
      await prisma.reconstructionVote.delete({
        where: {
          itemId_userId: {
            itemId: id,
            userId: req.user.userId,
          },
        },
      });
    } else {
      // Add vote
      await prisma.reconstructionVote.create({
        data: {
          itemId: id,
          userId: req.user.userId,
        },
      });
    }

    // Fetch updated item
    const item = await prisma.reconstructionItem.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            username: true,
          },
        },
        votes: {
          include: {
            user: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ message: "Nenalezeno." });
    }

    res.json({
      id: item.id,
      category: item.category,
      title: item.title,
      description: item.description,
      link: item.link,
      cost: item.cost ? parseFloat(item.cost.toString()) : undefined,
      status: item.status,
      votes: item.votes.map((v) => v.userId),
      createdBy: item.createdBy.username,
      createdAt: item.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Toggle vote error:", error);
    res.status(500).json({ message: "Chyba." });
  }
});

// ============================================================================
//                         UPDATE STATUS (tasks only)
// ============================================================================
router.patch("/:id/status", protect, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  const { id } = req.params;
  const { status } = req.body;

  try {
    const item = await prisma.reconstructionItem.findUnique({
      where: { id },
    });

    if (!item) {
      return res.status(404).json({ message: "Nenalezeno." });
    }

    if (item.category !== "task") {
      return res.status(400).json({ message: "Nelze měnit status u této kategorie." });
    }

    const updated = await prisma.reconstructionItem.update({
      where: { id },
      data: { status },
      include: {
        createdBy: {
          select: {
            username: true,
          },
        },
        votes: {
          include: {
            user: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    res.json({
      id: updated.id,
      category: updated.category,
      title: updated.title,
      description: updated.description,
      link: updated.link,
      cost: updated.cost ? parseFloat(updated.cost.toString()) : undefined,
      status: updated.status,
      votes: updated.votes.map((v) => v.userId),
      createdBy: updated.createdBy.username,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ message: "Chyba." });
  }
});

export default router;
