import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";

const router = Router();

// ============================================================================
//                           GET ALL THREADS
// ============================================================================
router.get("/", protect, async (req: Request, res: Response) => {
    try {
        const threads = await prisma.noteThread.findMany({
            orderBy: {
                createdAt: "asc",
            },
        });

        res.json(threads);
    } catch (error) {
        logger.error("NOTE_THREADS", "Get note threads error", { error: String(error), stack: (error as Error).stack });
        res.status(500).json({ message: "Chyba při načítání záložek zpráv." });
    }
});

// ============================================================================
//                           CREATE THREAD
// ============================================================================
router.post("/", protect, async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: "Neautorizováno" });
    }

    const { name } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ message: "Název záložky nesmí být prázdný." });
    }

    try {
        const newThread = await prisma.noteThread.create({
            data: {
                name: name.trim(),
                createdById: req.user.userId,
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
router.delete("/:id", protect, async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: "Neautorizováno" });
    }

    const { id } = req.params;

    try {
        const thread = await prisma.noteThread.findUnique({
            where: { id },
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
