import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import { requireCabin } from "../../middleware/cabinMiddleware";
import { validate } from "../../validators/validate";
import { createNoteThreadSchema } from "../../validators/schemas";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";

const router = Router();

// ============================================================================
//                           GET ALL THREADS (with last message preview)
// ============================================================================
router.get("/", protect, requireCabin, async (req: Request, res: Response) => {
    try {
        const cabinId = req.user!.cabinId!;

        // 1. Fetch threads
        const threads = await prisma.noteThread.findMany({
            where: { cabinId },
            orderBy: { createdAt: "asc" },
        });

        // 2. Count messages per thread (including null = "Hlavní")
        const counts = await prisma.note.groupBy({
            by: ["threadId"],
            where: { cabinId },
            _count: { id: true },
        });

        // 3. Last message per thread — one query for all thread IDs + null
        const threadIds = [null, ...threads.map((t) => t.id)];
        const lastMessages = await Promise.all(
            threadIds.map((tid) =>
                prisma.note.findFirst({
                    where: { cabinId, threadId: tid },
                    orderBy: { createdAt: "desc" },
                    include: { user: { select: { username: true } } },
                }).then((n) => ({ threadId: tid, note: n }))
            )
        );

        const countMap = new Map(counts.map((c) => [c.threadId, c._count.id]));
        const lastMap = new Map(lastMessages.map((lm) => [lm.threadId, lm.note]));

        // 4. Build enriched response
        const enriched = threads.map((t) => {
            const last = lastMap.get(t.id);
            return {
                ...t,
                createdAt: t.createdAt.toISOString(),
                messageCount: countMap.get(t.id) ?? 0,
                lastMessage: last ? last.message : null,
                lastMessageAt: last ? last.createdAt.toISOString() : null,
                lastMessageBy: last ? last.user.username : null,
            };
        });

        // 5. Add "Hlavní" (null) thread info
        const mainLast = lastMap.get(null);
        const mainThread = {
            id: null,
            name: "Hlavní",
            createdById: null,
            createdAt: null,
            messageCount: countMap.get(null) ?? 0,
            lastMessage: mainLast ? mainLast.message : null,
            lastMessageAt: mainLast ? mainLast.createdAt.toISOString() : null,
            lastMessageBy: mainLast ? mainLast.user.username : null,
        };

        res.json([mainThread, ...enriched]);
    } catch (error) {
        logger.error("NOTE_THREADS", "Get note threads error", { error: String(error), stack: (error as Error).stack });
        res.status(500).json({ message: "Chyba při načítání záložek zpráv." });
    }
});

// ============================================================================
//                           CREATE THREAD
// ============================================================================
router.post("/", protect, requireCabin, validate(createNoteThreadSchema), async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: "Neautorizováno" });
    }

    const { name } = req.body;

    try {
        const newThread = await prisma.noteThread.create({
            data: {
                name: name.trim(),
                createdById: req.user.userId,
                cabinId: req.user.cabinId!,
            },
        });

        res.status(201).json(newThread);
    } catch (error) {
        logger.error("NOTE_THREADS", "Create note thread error", { error: String(error), stack: (error as Error).stack, userId: req.user?.userId });
        res.status(500).json({ message: "Chyba při vytváření záložky." });
    }
});

// ============================================================================
//                           DELETE THREAD
// ============================================================================
router.delete("/:id", protect, requireCabin, async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: "Neautorizováno" });
    }

    const { id } = req.params;

    try {
        const thread = await prisma.noteThread.findFirst({
            where: { id, cabinId: req.user.cabinId },
        });

        if (!thread) {
            return res.status(404).json({ message: "Záložka nenalezena" });
        }

        if (req.user.role !== "admin" && thread.createdById !== req.user.userId) {
            return res.status(403).json({ message: "Nemáte oprávnění smazat tuto záložku." });
        }

        await prisma.noteThread.delete({
            where: { id },
        });

        res.json({ message: "Záložka smazána" });
    } catch (error) {
        logger.error("NOTE_THREADS", "Delete note thread error", { error: String(error), threadId: id });
        res.status(500).json({ message: "Chyba při mazání záložky." });
    }
});

export default router;
