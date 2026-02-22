import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";

const router = Router();

// ============================================================================
//                           GET ALL ACTIVE LISTS
// ============================================================================
router.get("/", protect, async (req: Request, res: Response) => {
    try {
        const lists = await prisma.shoppingList.findMany({
            where: {
                isResolved: false
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                createdBy: {
                    select: { id: true, username: true, color: true },
                },
                items: {
                    include: {
                        addedBy: {
                            select: { id: true, username: true, color: true },
                        },
                        purchasedBy: {
                            select: { id: true, username: true, color: true },
                        },
                        splits: true,
                    }
                }
            },
        });

        res.json(lists);
    } catch (error) {
        logger.error("SHOPPING_LISTS", "Failed to fetch shopping lists", error);
        res.status(500).json({ error: "Failed to fetch shopping lists" });
    }
});

// ============================================================================
//                           CREATE NEW LIST
// ============================================================================
router.post("/", protect, async (req: Request, res: Response) => {
    try {
        const { name } = req.body;

        if (!name || name.trim() === "") {
            return res.status(400).json({ error: "Missing required list name" });
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - req.user is set by authMiddleware
        const userId = req.user.userId;

        const newList = await prisma.shoppingList.create({
            data: {
                name: name.trim(),
                createdById: userId,
            },
            include: {
                createdBy: {
                    select: { id: true, username: true, color: true },
                },
                items: true,
            }
        });

        res.status(201).json(newList);
    } catch (error) {
        logger.error("SHOPPING_LISTS", "Failed to create shopping list", error);
        res.status(500).json({ error: "Failed to create shopping list" });
    }
});

// ============================================================================
//                           DELETE LIST
// ============================================================================
router.delete("/:id", protect, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const user = req.user;

        const list = await prisma.shoppingList.findUnique({
            where: { id },
        });

        if (!list) {
            return res.status(404).json({ error: "List not found" });
        }

        if (list.createdById !== user.userId && user.role !== "admin") {
            return res.status(403).json({ error: "Not authorized to delete this list" });
        }

        await prisma.shoppingList.delete({
            where: { id },
        });

        res.json({ message: "List deleted successfully" });
    } catch (error) {
        logger.error("SHOPPING_LISTS", "Failed to delete shopping list", error);
        res.status(500).json({ error: "Failed to delete shopping list" });
    }
});

// ============================================================================
//                           RESOLVE/ARCHIVE LIST
// ============================================================================
router.patch("/:id/resolve", protect, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { isResolved } = req.body;

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const user = req.user;

        const list = await prisma.shoppingList.findUnique({
            where: { id },
        });

        if (!list) {
            return res.status(404).json({ error: "List not found" });
        }

        // Potentially only creator or admin can resolve? Or anyone?
        // Let's allow anyone to resolve a shopping list for flexibility
        const updatedList = await prisma.shoppingList.update({
            where: { id },
            data: {
                isResolved: Boolean(isResolved)
            }
        });

        res.json(updatedList);
    } catch (error) {
        logger.error("SHOPPING_LISTS", "Failed to resolve shopping list", error);
        res.status(500).json({ error: "Failed to resolve shopping list" });
    }
});

export default router;
