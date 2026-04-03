import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import { requireCabin } from "../../middleware/cabinMiddleware";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";
import { createMessageSchema, createChannelSchema } from "../../validators/schemas";

const router = Router();

// ============================================================================
//  Helper: format a Note record into the API response shape
// ============================================================================
function formatNote(
  note: {
    id: string;
    userId: string;
    threadId: string | null;
    message: string;
    createdAt: Date;
    isResolvedAsTask: boolean;
    editedAt: Date | null;
    isPinned: boolean;
    replyToId: string | null;
    user: { username: string };
    replyTo: {
      id: string;
      message: string;
      user: { username: string };
    } | null;
    reactions: { emoji: string; userId: string }[];
  },
  currentUserId: string,
) {
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
    replyTo: note.replyTo
      ? {
          id: note.replyTo.id,
          message:
            note.replyTo.message.length > 100
              ? note.replyTo.message.slice(0, 100) + "…"
              : note.replyTo.message,
          username: note.replyTo.user.username,
        }
      : null,
    reactions: Array.from(reactionMap.entries()).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      reacted: data.reacted,
    })),
  };
}

const MESSAGE_INCLUDE = {
  user: { select: { username: true } },
  replyTo: {
    select: {
      id: true,
      message: true,
      user: { select: { username: true } },
    },
  },
  reactions: {
    select: { emoji: true, userId: true },
  },
};

// ============================================================================
//  GET /api/channels — list all channels with last-message preview
// ============================================================================
router.get("/", protect, requireCabin, async (req: Request, res: Response) => {
  try {
    const cabinId = req.user!.cabinId!;
    const userId = req.user!.userId;

    const [threads, counts, readStatuses] = await Promise.all([
      prisma.noteThread.findMany({
        where: { cabinId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.note.groupBy({
        by: ["threadId"],
        where: { cabinId },
        _count: { id: true },
      }),
      prisma.threadReadStatus.findMany({
        where: { cabinId, userId },
        select: { threadId: true, lastReadAt: true },
      }),
    ]);

    // Batch fetch last message per thread in a single query (fixes N+1)
    const lastMessageRows = await prisma.note.findMany({
      where: { cabinId },
      distinct: ["threadId"],
      orderBy: { createdAt: "desc" },
      select: {
        threadId: true,
        message: true,
        createdAt: true,
        user: { select: { username: true } },
      },
    });

    const allLastMessages = lastMessageRows.map((row) => ({
      threadId: row.threadId,
      note: { message: row.message, createdAt: row.createdAt, user: { username: row.user.username } },
    }));
    const countMap = new Map(counts.map((c) => [c.threadId, c._count.id]));
    const lastMap = new Map(allLastMessages.map((lm) => [lm.threadId, lm.note]));
    const readMap = new Map(readStatuses.map((rs) => [rs.threadId, rs.lastReadAt]));

    const enriched = threads.map((t) => {
      const last = lastMap.get(t.id);
      const lastReadAt = readMap.get(t.id);
      const hasUnread = last
        ? !lastReadAt || last.createdAt > lastReadAt
        : false;
      return {
        ...t,
        createdAt: t.createdAt.toISOString(),
        messageCount: countMap.get(t.id) ?? 0,
        lastMessage: last ? last.message : null,
        lastMessageAt: last ? last.createdAt.toISOString() : null,
        lastMessageBy: last ? last.user.username : null,
        hasUnread,
      };
    });

    const mainLast = lastMap.get(null);
    const mainLastReadAt = readMap.get(null);
    const mainHasUnread = mainLast
      ? !mainLastReadAt || mainLast.createdAt > mainLastReadAt
      : false;
    const mainChannel = {
      id: null,
      name: "Hlavní",
      createdById: null,
      createdAt: null,
      messageCount: countMap.get(null) ?? 0,
      lastMessage: mainLast ? mainLast.message : null,
      lastMessageAt: mainLast ? mainLast.createdAt.toISOString() : null,
      lastMessageBy: mainLast ? mainLast.user.username : null,
      hasUnread: mainHasUnread,
    };

    res.json([mainChannel, ...enriched]);
  } catch (error) {
    logger.error("CHANNELS", "Get channels error", {
      error: String(error),
      stack: (error as Error).stack,
    });
    res.status(500).json({ message: "Chyba při načítání kanálů." });
  }
});

// ============================================================================
//  POST /api/channels — create a named channel
// ============================================================================
router.post("/", protect, requireCabin, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno" });

  const parsed = createChannelSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Neplatný vstup" });
  }

  try {
    const newChannel = await prisma.noteThread.create({
      data: {
        name: parsed.data.name,
        createdById: req.user.userId,
        cabinId: req.user.cabinId!,
      },
    });
    res.status(201).json(newChannel);
  } catch (error) {
    logger.error("CHANNELS", "Create channel error", {
      error: String(error),
      stack: (error as Error).stack,
      userId: req.user?.userId,
    });
    res.status(500).json({ message: "Chyba při vytváření kanálu." });
  }
});

// ============================================================================
//  DELETE /api/channels/:id — delete a named channel
// ============================================================================
router.delete("/:id", protect, requireCabin, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno" });

  const { id } = req.params;

  try {
    const channel = await prisma.noteThread.findFirst({
      where: { id, cabinId: req.user.cabinId },
    });

    if (!channel) return res.status(404).json({ message: "Kanál nenalezen." });

    if (req.user.role !== "admin" && channel.createdById !== req.user.userId) {
      return res.status(403).json({ message: "Nemáte oprávnění smazat tento kanál." });
    }

    await prisma.noteThread.delete({ where: { id } });
    res.json({ message: "Kanál smazán." });
  } catch (error) {
    logger.error("CHANNELS", "Delete channel error", { error: String(error), channelId: id });
    res.status(500).json({ message: "Chyba při mazání kanálu." });
  }
});

// ============================================================================
//  Shared helper: parse pagination query params
// ============================================================================
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

function parsePagination(query: Record<string, unknown>) {
  const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const cursor = typeof query.cursor === "string" && query.cursor ? query.cursor : undefined;
  return { limit, cursor };
}

// ============================================================================
//  GET /api/channels/messages — messages for the "Hlavní" thread (threadId = null)
//  Supports cursor-based pagination: ?limit=50&cursor=<lastMessageId>
//  Returns oldest-first. Cursor loads messages BEFORE the cursor (older).
// ============================================================================
router.get("/messages", protect, requireCabin, async (req: Request, res: Response) => {
  try {
    const cabinId = req.user!.cabinId!;
    const currentUserId = req.user!.userId;
    const { limit, cursor } = parsePagination(req.query as Record<string, unknown>);

    const notes = await prisma.note.findMany({
      where: { cabinId, threadId: null },
      include: MESSAGE_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: limit + 1, // Fetch one extra to detect if there are more
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = notes.length > limit;
    if (hasMore) notes.pop();

    // Reverse to return oldest-first (natural chat order)
    notes.reverse();

    const nextCursor = hasMore && notes.length > 0 ? notes[0].id : null;

    res.json({
      messages: notes.map((n) => formatNote(n, currentUserId)),
      nextCursor,
      hasMore,
    });
  } catch (error) {
    logger.error("CHANNELS", "Get main messages error", {
      error: String(error),
      stack: (error as Error).stack,
    });
    res.status(500).json({ message: "Chyba při načítání zpráv." });
  }
});

// ============================================================================
//  POST /api/channels/messages — send a message to the "Hlavní" thread
// ============================================================================
router.post("/messages", protect, requireCabin, async (req: Request, res: Response) => {
  if (req.user!.role === "guest") {
    return res.status(403).json({ message: "Hosté nemohou psát zprávy." });
  }

  const parsed = createMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Neplatný vstup" });
  }

  const { message, replyToId } = parsed.data;

  try {
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
        threadId: null,
        message,
        replyToId: replyToId ?? null,
      },
      include: MESSAGE_INCLUDE,
    });

    res.status(201).json(formatNote({ ...newNote, reactions: [] }, req.user!.userId));
  } catch (error) {
    logger.error("CHANNELS", "Post main message error", {
      error: String(error),
      stack: (error as Error).stack,
    });
    res.status(500).json({ message: "Chyba při odesílání zprávy." });
  }
});

// ============================================================================
//  GET /api/channels/:channelId/messages — messages for a named channel
//  Supports cursor-based pagination: ?limit=50&cursor=<lastMessageId>
// ============================================================================
router.get("/:channelId/messages", protect, requireCabin, async (req: Request, res: Response) => {
  const { channelId } = req.params;
  const cabinId = req.user!.cabinId!;
  const currentUserId = req.user!.userId;
  const { limit, cursor } = parsePagination(req.query as Record<string, unknown>);

  try {
    // Verify channel belongs to this cabin
    const channel = await prisma.noteThread.findFirst({
      where: { id: channelId, cabinId },
    });
    if (!channel) {
      return res.status(404).json({ message: "Kanál nenalezen nebo k němu nemáte přístup." });
    }

    const notes = await prisma.note.findMany({
      where: { cabinId, threadId: channelId },
      include: MESSAGE_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = notes.length > limit;
    if (hasMore) notes.pop();
    notes.reverse();

    const nextCursor = hasMore && notes.length > 0 ? notes[0].id : null;

    res.json({
      messages: notes.map((n) => formatNote(n, currentUserId)),
      nextCursor,
      hasMore,
    });
  } catch (error) {
    logger.error("CHANNELS", "Get channel messages error", {
      error: String(error),
      channelId,
    });
    res.status(500).json({ message: "Chyba při načítání zpráv." });
  }
});

// ============================================================================
//  POST /api/channels/:channelId/messages — send a message to a named channel
// ============================================================================
router.post("/:channelId/messages", protect, requireCabin, async (req: Request, res: Response) => {
  if (req.user!.role === "guest") {
    return res.status(403).json({ message: "Hosté nemohou psát zprávy." });
  }

  const { channelId } = req.params;
  const cabinId = req.user!.cabinId!;

  const parsed = createMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Neplatný vstup" });
  }

  const { message, replyToId } = parsed.data;

  try {
    // Verify channel belongs to this cabin (prevent cross-cabin write)
    const channel = await prisma.noteThread.findFirst({
      where: { id: channelId, cabinId },
    });
    if (!channel) {
      return res.status(403).json({ message: "Kanál nenalezen nebo k němu nemáte přístup." });
    }

    if (replyToId) {
      const replyTarget = await prisma.note.findFirst({
        where: { id: replyToId, cabinId },
      });
      if (!replyTarget) {
        return res.status(404).json({ message: "Citovaná zpráva nenalezena." });
      }
    }

    const newNote = await prisma.note.create({
      data: {
        userId: req.user!.userId,
        cabinId,
        threadId: channelId,
        message,
        replyToId: replyToId ?? null,
      },
      include: MESSAGE_INCLUDE,
    });

    res.status(201).json(formatNote({ ...newNote, reactions: [] }, req.user!.userId));
  } catch (error) {
    logger.error("CHANNELS", "Post channel message error", {
      error: String(error),
      channelId,
    });
    res.status(500).json({ message: "Chyba při odesílání zprávy." });
  }
});

// ============================================================================
//  POST /api/channels/:channelId/read — mark channel as read for current user
// ============================================================================
router.post("/:channelId/read", protect, requireCabin, async (req: Request, res: Response) => {
  try {
    const cabinId = req.user!.cabinId!;
    const userId = req.user!.userId;
    const { channelId } = req.params;

    // "main" or empty string → null (Hlavní channel)
    const threadId = channelId === "main" || channelId === "" ? null : channelId;

    // Verify named thread exists and belongs to cabin
    if (threadId !== null) {
      const channel = await prisma.noteThread.findFirst({
        where: { id: threadId, cabinId },
        select: { id: true },
      });
      if (!channel) {
        return res.status(404).json({ message: "Kanál nenalezen." });
      }
    }

    // Nullable threadId means SQL NULL != NULL, so compound unique upsert
    // doesn't work for the "Hlavní" channel (threadId = null).
    // Use findFirst + update/create instead.
    const existing = await prisma.threadReadStatus.findFirst({
      where: { userId, threadId, cabinId },
      select: { id: true },
    });

    if (existing) {
      await prisma.threadReadStatus.update({
        where: { id: existing.id },
        data: { lastReadAt: new Date() },
      });
    } else {
      await prisma.threadReadStatus.create({
        data: { userId, threadId, cabinId, lastReadAt: new Date() },
      });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error("CHANNELS", "Mark channel read error", {
      error: String(error),
      channelId: req.params.channelId,
    });
    res.status(500).json({ message: "Chyba při označování kanálu jako přečteného." });
  }
});

export default router;
