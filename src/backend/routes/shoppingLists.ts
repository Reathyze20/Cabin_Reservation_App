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
        const { isPantry } = req.query;

        const whereClause: any = {
            isResolved: false
        };

        if (isPantry === 'true') {
            whereClause.isPantry = true;
        } else if (isPantry === 'false') {
            whereClause.isPantry = false;
        }

        const lists = await prisma.shoppingList.findMany({
            where: whereClause,
            orderBy: {
                createdAt: "desc",
            },
            include: {
                createdBy: {
                    select: { id: true, username: true, color: true, animalIcon: true },
                },
                items: {
                    include: {
                        addedBy: {
                            select: { id: true, username: true, color: true, animalIcon: true },
                        },
                        purchasedBy: {
                            select: { id: true, username: true, color: true, animalIcon: true },
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

        if (name.trim().length > 100) {
            return res.status(400).json({ error: "List name is too long (max 100 characters)" });
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
//                           GET OR CREATE PANTRY LIST
// ============================================================================
router.get("/pantry", protect, async (req: Request, res: Response) => {
    try {
        let pantry = await prisma.shoppingList.findFirst({
            where: { isPantry: true },
            include: {
                items: {
                    include: {
                        addedBy: {
                            select: { id: true, username: true, color: true, animalIcon: true },
                        },
                        purchasedBy: {
                            select: { id: true, username: true, color: true, animalIcon: true },
                        },
                        splits: true,
                    }
                }
            }
        });

        if (!pantry) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const userId = req.user.userId;
            pantry = await prisma.shoppingList.create({
                data: {
                    name: "Zásoby (Spižírna)",
                    createdById: userId,
                    isPantry: true,
                },
                include: {
                    items: {
                        include: {
                            addedBy: {
                                select: { id: true, username: true, color: true, animalIcon: true },
                            },
                            purchasedBy: {
                                select: { id: true, username: true, color: true, animalIcon: true },
                            },
                            splits: true,
                        }
                    }
                }
            });
        }

        res.json(pantry);
    } catch (error) {
        logger.error("SHOPPING_LISTS", "Failed to fetch or create pantry", error);
        res.status(500).json({ error: "Failed to fetch or create pantry" });
    }
});

// ============================================================================
//                           DELETE LIST
// ============================================================================
router.delete("/:id", protect, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: "Not authorized" });
        }

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

// ============================================================================
//                    TOGGLE ITEM PURCHASED (with inventory loop-closure)
// PUT /:listId/items/:itemId  { purchased: boolean }
// When purchased=true and the item has a linkedInventoryId,
// auto-update the InventoryItem to { status: "OK", inCart: false }
// ============================================================================
router.put("/:listId/items/:itemId", protect, async (req: Request, res: Response) => {
    try {
        const { listId, itemId } = req.params;
        const { purchased } = req.body;

        // @ts-ignore
        const userId: string = req.user.userId;

        const item = await prisma.shoppingListItem.findUnique({
            where: { id: itemId },
        });

        if (!item || item.listId !== listId) {
            return res.status(404).json({ error: "Item not found in this list" });
        }

        const newPurchased = Boolean(purchased);

        const updatedItem = await prisma.$transaction(async (tx) => {
            const updated = await tx.shoppingListItem.update({
                where: { id: itemId },
                data: {
                    purchased: newPurchased,
                    status: newPurchased ? "purchased" : "pending",
                    purchasedById: newPurchased ? userId : null,
                    purchasedAt: newPurchased ? new Date() : null,
                },
            });

            // Loop-closure: if this item was linked to an inventory entry, restock it
            if (newPurchased && updated.linkedInventoryId) {
                await tx.inventoryItem.update({
                    where: { id: updated.linkedInventoryId },
                    data: { status: "OK", inCart: false },
                });
            }

            return updated;
        });

        res.json(updatedItem);
    } catch (error) {
        logger.error("SHOPPING_LISTS", "Failed to update item purchased status", error);
        res.status(500).json({ error: "Failed to update item" });
    }
});

export default router;
