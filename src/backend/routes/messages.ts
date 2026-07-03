import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import { requireCabin } from "../../middleware/cabinMiddleware";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";
import { editNoteSchema, noteReactionSchema } from "../../validators/schemas";
import { emitToCabin } from "../../utils/socket";

const router = Router();

const EDIT_TIME_LIMIT_MS = 15 * 60 * 1000; // 15 minutes

// ============================================================================
//  PATCH /api/messages/:messageId — edit own message (within 15 min)
// ============================================================================
router.patch("/:messageId", protect, requireCabin, async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const parsed = editNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Neplatný vstup" });
  }

  try {
    const note = await prisma.note.findFirst({
      where: { id: messageId, cabinId: req.user!.cabinId! },
    });

    if (!note) return res.status(404).json({ message: "Zpráva nenalezena." });

    if (note.userId !== req.user!.userId) {
      return res.status(403).json({ message: "Můžete upravovat pouze vlastní zprávy." });
    }

    const elapsed = Date.now() - note.createdAt.getTime();
    if (elapsed > EDIT_TIME_LIMIT_MS) {
      return res.status(403).json({ message: "Zprávu lze upravit pouze do 15 minut od odeslání." });
    }

    const updated = await prisma.note.update({
      where: { id: messageId },
      data: { message: parsed.data.message, editedAt: new Date() },
    });

    const payload = {
      id: updated.id,
      threadId: updated.threadId,
      message: updated.message,
      editedAt: updated.editedAt?.toISOString() ?? null,
    };
    emitToCabin(req.user!.cabinId!, "message:updated", payload);
    res.json(payload);
  } catch (error) {
    logger.error("MESSAGES", "Edit message error", { error: String(error), messageId });
    res.status(500).json({ message: "Chyba při úpravě zprávy." });
  }
});

// ============================================================================
//  DELETE /api/messages/:messageId — delete message (admin or owner)
// ============================================================================
router.delete("/:messageId", protect, requireCabin, async (req: Request, res: Response) => {
  const { messageId } = req.params;

  try {
    const note = await prisma.note.findFirst({
      where: { id: messageId, cabinId: req.user!.cabinId },
    });

    if (!note) return res.status(404).json({ message: "Zpráva nenalezena." });

    if (req.user!.role !== "admin" && note.userId !== req.user!.userId) {
      return res.status(403).json({ message: "Nemáte oprávnění smazat tuto zprávu." });
    }

    await prisma.note.delete({ where: { id: messageId } });
    emitToCabin(req.user!.cabinId!, "message:deleted", { id: messageId, threadId: note.threadId });
    res.json({ message: "Smazáno." });
  } catch (error) {
    logger.error("MESSAGES", "Delete message error", { error: String(error), messageId });
    res.status(500).json({ message: "Chyba při mazání zprávy." });
  }
});

// ============================================================================
//  PATCH /api/messages/:messageId/pin — toggle pin (non-guest only)
// ============================================================================
router.patch("/:messageId/pin", protect, requireCabin, async (req: Request, res: Response) => {
  if (req.user!.role === "guest") {
    return res.status(403).json({ message: "Hosté nemohou připínat zprávy." });
  }

  const { messageId } = req.params;

  try {
    const note = await prisma.note.findFirst({
      where: { id: messageId, cabinId: req.user!.cabinId! },
    });

    if (!note) return res.status(404).json({ message: "Zpráva nenalezena." });

    const updated = await prisma.note.update({
      where: { id: messageId },
      data: { isPinned: !note.isPinned },
    });

    emitToCabin(req.user!.cabinId!, "message:updated", { id: updated.id, threadId: updated.threadId, isPinned: updated.isPinned });
    res.json({ id: updated.id, isPinned: updated.isPinned });
  } catch (error) {
    logger.error("MESSAGES", "Pin message error", { error: String(error), messageId });
    res.status(500).json({ message: "Chyba při připínání zprávy." });
  }
});

// ============================================================================
//  PATCH /api/messages/:messageId/resolve — mark as resolved (converted to task)
// ============================================================================
router.patch("/:messageId/resolve", protect, requireCabin, async (req: Request, res: Response) => {
  if (req.user!.role === "guest") {
    return res.status(403).json({ message: "Nemáte oprávnění." });
  }

  const { messageId } = req.params;

  try {
    const note = await prisma.note.findFirst({
      where: { id: messageId, cabinId: req.user!.cabinId },
    });

    if (!note) return res.status(404).json({ message: "Zpráva nenalezena." });

    const updated = await prisma.note.update({
      where: { id: messageId },
      data: { isResolvedAsTask: true },
    });

    emitToCabin(req.user!.cabinId!, "message:updated", { id: updated.id, threadId: updated.threadId, isResolvedAsTask: updated.isResolvedAsTask });
    res.json({ id: updated.id, isResolvedAsTask: updated.isResolvedAsTask });
  } catch (error) {
    logger.error("MESSAGES", "Resolve message error", { error: String(error), messageId });
    res.status(500).json({ message: "Chyba při označování zprávy." });
  }
});

// ============================================================================
//  POST /api/messages/:messageId/reactions — toggle emoji reaction
// ============================================================================
router.post("/:messageId/reactions", protect, requireCabin, async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const parsed = noteReactionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Neplatný emoji" });
  }

  const { emoji } = parsed.data;
  const userId = req.user!.userId;

  try {
    const note = await prisma.note.findFirst({
      where: { id: messageId, cabinId: req.user!.cabinId! },
    });

    if (!note) return res.status(404).json({ message: "Zpráva nenalezena." });

    const existing = await prisma.noteReaction.findUnique({
      where: { noteId_userId_emoji: { noteId: messageId, userId, emoji } },
    });

    if (existing) {
      await prisma.noteReaction.delete({ where: { id: existing.id } });
      emitToCabin(req.user!.cabinId!, "message:reaction", { messageId, threadId: note.threadId, emoji, action: "removed", userId });
      res.json({ action: "removed", emoji });
    } else {
      await prisma.noteReaction.create({ data: { noteId: messageId, userId, emoji } });
      emitToCabin(req.user!.cabinId!, "message:reaction", { messageId, threadId: note.threadId, emoji, action: "added", userId });
      res.json({ action: "added", emoji });
    }
  } catch (error) {
    logger.error("MESSAGES", "Reaction error", { error: String(error), messageId });
    res.status(500).json({ message: "Chyba při přidávání reakce." });
  }
});

export default router;
