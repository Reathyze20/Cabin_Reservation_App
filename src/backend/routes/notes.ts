import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import { requireCabin } from "../../middleware/cabinMiddleware";
import { validate } from "../../validators/validate";
import { createNoteSchema, editNoteSchema, noteReactionSchema } from "../../validators/schemas";
import { emitToCabin } from "../../utils/socket";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";

const router = Router();

const EDIT_TIME_LIMIT_MS = 15 * 60 * 1000; // 15 minutes

// ============================================================================
//                           GET ALL NOTES
// ============================================================================
router.get("/", protect, requireCabin, async (req: Request, res: Response) => {
  try {
    const threadId = req.query.threadId as string | undefined;
    const cabinId = req.user!.cabinId!;
    const currentUserId = req.user!.userId;

    const whereClause = threadId === 'all' 
      ? { cabinId } 
      : { cabinId, threadId: threadId ? threadId : null };

    const notes = await prisma.note.findMany({
      where: whereClause,
      include: {
        user: {
          select: { username: true },
        },
        replyTo: {
          select: {
            id: true,
            message: true,
            user: { select: { username: true } },
          },
        },
        reactions: {
          select: {
            emoji: true,
            userId: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formatted = notes.map((note) => {
      // Aggregate reactions: group by emoji, count, check if current user reacted
      const reactionMap = new Map<string, { count: number; reacted: boolean }>();
      for (const r of note.reactions) {
        const existing = reactionMap.get(r.emoji);
        if (existing) {
          existing.count++;
          if (r.userId === currentUserId) existing.reacted = true;
        } else {
          reactionMap.set(r.emoji, { count: 1, reacted: r.userId === currentUserId });
        }
      }

      return {
        id: note.id,
        userId: note.userId,
        threadId: note.threadId,
        username: note.user.username,
        message: note.message,
        createdAt: note.createdAt.toISOString(),
        isResolvedAsTask: note.isResolvedAsTask,
        editedAt: note.editedAt?.toISOString() ?? null,
        isPinned: note.isPinned,
        replyToId: note.replyToId,
        replyTo: note.replyTo ? {
          id: note.replyTo.id,
          message: note.replyTo.message.length > 100 
            ? note.replyTo.message.slice(0, 100) + "…" 
            : note.replyTo.message,
          username: note.replyTo.user.username,
        } : null,
        reactions: Array.from(reactionMap.entries()).map(([emoji, data]) => ({
          emoji,
          count: data.count,
          reacted: data.reacted,
        })),
      };
    });

    res.json(formatted);
  } catch (error) {
    logger.error("NOTES", "Get notes error", { error: String(error), stack: (error as Error).stack });
    res.status(500).json({ message: "Chyba" });
  }
});

// ============================================================================
//                           CREATE NOTE
// ============================================================================
router.post("/", protect, requireCabin, validate(createNoteSchema), async (req: Request, res: Response) => {
  const { message, threadId, replyToId } = req.body;

  try {
    // Validate replyToId exists if provided
    if (replyToId) {
      const replyTarget = await prisma.note.findFirst({
        where: { id: replyToId, cabinId: req.user!.cabinId! },
      });
      if (!replyTarget) {
        return res.status(404).json({ message: "Citovaná zpráva nenalezena." });
      }
    }

    const newNote = await prisma.note.create({
      data: {
        userId: req.user!.userId,
        cabinId: req.user!.cabinId!,
        threadId: threadId || null,
        message,
        replyToId: replyToId || null,
      },
      include: {
        user: { select: { username: true } },
        replyTo: {
          select: {
            id: true,
            message: true,
            user: { select: { username: true } },
          },
        },
      },
    });

    const response = {
      id: newNote.id,
      userId: newNote.userId,
      threadId: newNote.threadId,
      username: newNote.user.username,
      message: newNote.message,
      createdAt: newNote.createdAt.toISOString(),
      isResolvedAsTask: newNote.isResolvedAsTask,
      editedAt: null,
      isPinned: false,
      replyToId: newNote.replyToId,
      replyTo: newNote.replyTo ? {
        id: newNote.replyTo.id,
        message: newNote.replyTo.message.length > 100
          ? newNote.replyTo.message.slice(0, 100) + "…"
          : newNote.replyTo.message,
        username: newNote.replyTo.user.username,
      } : null,
      reactions: [],
    };

    // Real-time broadcast to cabin members
    emitToCabin(req.user!.cabinId!, "note:created", response);

    res.status(201).json(response);
  } catch (error) {
    logger.error("NOTES", "Create note error", { error: String(error), stack: (error as Error).stack, userId: req.user?.userId });
    res.status(500).json({ message: "Chyba" });
  }
});

// ============================================================================
//                        MARK NOTE AS RESOLVED (task created)
// ============================================================================
router.patch("/:id/resolve", protect, requireCabin, async (req: Request, res: Response) => {
  if (req.user!.role === "guest") {
    return res.status(403).json({ message: "Nemáte oprávnění." });
  }

  const { id } = req.params;

  try {
    const note = await prisma.note.findFirst({ where: { id, cabinId: req.user!.cabinId } });
    if (!note) {
      return res.status(404).json({ message: "Zpráva nenalezena." });
    }

    const updated = await prisma.note.update({
      where: { id },
      data: { isResolvedAsTask: true },
    });

    res.json({ id: updated.id, isResolvedAsTask: updated.isResolvedAsTask });
  } catch (error) {
    logger.error("NOTES", "Resolve note error", { error: String(error), noteId: id });
    res.status(500).json({ message: "Chyba při označování zprávy." });
  }
});

// ============================================================================
//                           DELETE NOTE
// ============================================================================
router.delete("/:id", protect, requireCabin, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const note = await prisma.note.findFirst({
      where: { id, cabinId: req.user!.cabinId },
    });

    if (!note) {
      return res.status(404).json({ message: "Nenalezeno" });
    }

    if (req.user!.role !== "admin" && note.userId !== req.user!.userId) {
      return res.status(403).json({ message: "Nemáte oprávnění." });
    }

    await prisma.note.delete({
      where: { id },
    });

    res.json({ message: "Smazáno" });
  } catch (error) {
    logger.error("NOTES", "Delete note error", { error: String(error), noteId: id });
    res.status(500).json({ message: "Chyba" });
  }
});

// ============================================================================
//                           EDIT NOTE (own messages only, within 15 min)
// ============================================================================
router.patch("/:id", protect, requireCabin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = editNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Neplatný vstup" });
  }

  try {
    const note = await prisma.note.findFirst({
      where: { id, cabinId: req.user!.cabinId! },
    });

    if (!note) {
      return res.status(404).json({ message: "Zpráva nenalezena." });
    }

    if (note.userId !== req.user!.userId) {
      return res.status(403).json({ message: "Můžete upravovat pouze vlastní zprávy." });
    }

    const elapsed = Date.now() - note.createdAt.getTime();
    if (elapsed > EDIT_TIME_LIMIT_MS) {
      return res.status(403).json({ message: "Zprávu lze upravit pouze do 15 minut od odeslání." });
    }

    const updated = await prisma.note.update({
      where: { id },
      data: {
        message: parsed.data.message,
        editedAt: new Date(),
      },
    });

    res.json({
      id: updated.id,
      message: updated.message,
      editedAt: updated.editedAt?.toISOString() ?? null,
    });
  } catch (error) {
    logger.error("NOTES", "Edit note error", { error: String(error), noteId: id });
    res.status(500).json({ message: "Chyba při úpravě zprávy." });
  }
});

// ============================================================================
//                           TOGGLE PIN
// ============================================================================
router.patch("/:id/pin", protect, requireCabin, async (req: Request, res: Response) => {
  if (req.user!.role === "guest") {
    return res.status(403).json({ message: "Nemáte oprávnění." });
  }

  const { id } = req.params;

  try {
    const note = await prisma.note.findFirst({
      where: { id, cabinId: req.user!.cabinId! },
    });

    if (!note) {
      return res.status(404).json({ message: "Zpráva nenalezena." });
    }

    const updated = await prisma.note.update({
      where: { id },
      data: { isPinned: !note.isPinned },
    });

    res.json({ id: updated.id, isPinned: updated.isPinned });
  } catch (error) {
    logger.error("NOTES", "Pin note error", { error: String(error), noteId: id });
    res.status(500).json({ message: "Chyba při připínání zprávy." });
  }
});

// ============================================================================
//                           TOGGLE REACTION
// ============================================================================
router.post("/:id/reactions", protect, requireCabin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = noteReactionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Neplatný emoji" });
  }

  const { emoji } = parsed.data;
  const userId = req.user!.userId;

  try {
    const note = await prisma.note.findFirst({
      where: { id, cabinId: req.user!.cabinId! },
    });

    if (!note) {
      return res.status(404).json({ message: "Zpráva nenalezena." });
    }

    // Toggle: if exists → delete, if not → create
    const existing = await prisma.noteReaction.findUnique({
      where: { noteId_userId_emoji: { noteId: id, userId, emoji } },
    });

    if (existing) {
      await prisma.noteReaction.delete({ where: { id: existing.id } });
      res.json({ action: "removed", emoji });
    } else {
      await prisma.noteReaction.create({
        data: { noteId: id, userId, emoji },
      });
      res.json({ action: "added", emoji });
    }
  } catch (error) {
    logger.error("NOTES", "Reaction error", { error: String(error), noteId: id });
    res.status(500).json({ message: "Chyba při přidávání reakce." });
  }
});

export default router;
