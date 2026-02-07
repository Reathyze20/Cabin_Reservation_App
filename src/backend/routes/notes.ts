import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";

const router = Router();

// ============================================================================
//                           GET ALL NOTES
// ============================================================================
router.get("/", protect, async (req: Request, res: Response) => {
  try {
    const notes = await prisma.note.findMany({
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formatted = notes.map((note) => ({
      id: note.id,
      userId: note.userId,
      username: note.user.username,
      message: note.message,
      createdAt: note.createdAt.toISOString(),
    }));

    res.json(formatted);
  } catch (error) {
    logger.error("NOTES", "Get notes error", { error: String(error), stack: (error as Error).stack });
    res.status(500).json({ message: "Chyba" });
  }
});

// ============================================================================
//                           CREATE NOTE
// ============================================================================
router.post("/", protect, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ message: "Zpráva nesmí být prázdná." });
  }

  try {
    const newNote = await prisma.note.create({
      data: {
        userId: req.user.userId,
        message,
      },
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
    });

    res.status(201).json({
      id: newNote.id,
      userId: newNote.userId,
      username: newNote.user.username,
      message: newNote.message,
      createdAt: newNote.createdAt.toISOString(),
    });
  } catch (error) {
    logger.error("NOTES", "Create note error", { error: String(error), stack: (error as Error).stack, userId: req.user?.userId });
    res.status(500).json({ message: "Chyba" });
  }
});

// ============================================================================
//                           DELETE NOTE
// ============================================================================
router.delete("/:id", protect, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  const { id } = req.params;

  try {
    const note = await prisma.note.findUnique({
      where: { id },
    });

    if (!note) {
      return res.status(404).json({ message: "Nenalezeno" });
    }

    if (req.user.role !== "admin" && note.userId !== req.user.userId) {
      return res.status(403).json({ message: "Nemáte oprávnění." });
    }

    await prisma.note.delete({
      where: { id },
    });

    res.json({ message: "Smazáno" });
  } catch (error) {
    console.error("Delete note error:", error);
    res.status(500).json({ message: "Chyba" });
  }
});

export default router;
