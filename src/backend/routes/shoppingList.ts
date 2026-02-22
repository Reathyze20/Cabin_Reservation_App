import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";

const router = Router();

// ============================================================================
//                      GET SHOPPING LISTS
// ============================================================================
router.get("/", protect, async (req: Request, res: Response) => {
  try {
    const items = await prisma.shoppingListItem.findMany({
      include: {
        addedBy: { select: { username: true } },
        purchasedBy: { select: { username: true } },
        splits: {
          include: {
            user: { select: { id: true, username: true } },
          },
        },
      },
    });

    const formatted = items.map((item) => ({
      id: item.id,
      name: item.name,
      addedBy: item.addedBy.username,
      addedById: item.addedById,
      createdAt: item.createdAt.toISOString(),
      purchased: item.purchased,
      purchasedBy: item.purchasedBy?.username,
      purchasedById: item.purchasedById,
      purchasedAt: item.purchasedAt?.toISOString(),
      price: item.price ? parseFloat(item.price.toString()) : undefined,
      splitWith: item.splits.map((s) => s.userId),
    }));

    res.json([{ id: "default", name: "Hlavní seznam", items: formatted }]);
  } catch (error) {
    logger.error("SHOPPING", "Get shopping list error", { error: String(error) });
    res.status(500).json({ message: "Chyba" });
  }
});

// ============================================================================
//                      CREATE SHOPPING LIST
// ============================================================================
router.post("/", protect, async (req: Request, res: Response) => {
  res.status(200).json({ id: "default", name: "Hlavní seznam", items: [] });
});

// ============================================================================
//                        ADD ITEM TO LIST
// ============================================================================
router.post("/:listId/items", protect, async (req: Request, res: Response) => {
  const { name } = req.body;
  const { listId } = req.params;

  if (!name) {
    return res.status(400).json({ message: "Chybí název." });
  }

  try {
    const newItem = await prisma.shoppingListItem.create({
      data: {
        name,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        addedById: req.user.userId,
        listId: listId === "default" ? null : listId, // For legacy / transition
      },
      include: {
        addedBy: { select: { username: true } },
      },
    });

    res.status(201).json({
      id: newItem.id,
      name: newItem.name,
      addedBy: newItem.addedBy.username,
      addedById: newItem.addedById,
      createdAt: newItem.createdAt.toISOString(),
      purchased: newItem.purchased,
    });
  } catch (error) {
    logger.error("SHOPPING", "Add item error", { error: String(error) });
    res.status(500).json({ message: "Chyba" });
  }
});

// ============================================================================
//                    MARK ITEM AS PURCHASED
// ============================================================================
router.put("/:itemId/purchase", protect, async (req: Request, res: Response) => {
  const { itemId } = req.params;
  const { purchased, price, splitWith } = req.body;

  try {
    // Update main item
    const updated = await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: {
        purchased,
        ...(purchased
          ? {
            purchasedById: req.user!.userId,
            purchasedAt: new Date(),
            price: price ? parseFloat(price) : null,
          }
          : {
            purchasedById: null,
            purchasedAt: null,
            price: null,
          }),
      },
      include: {
        addedBy: { select: { username: true } },
        purchasedBy: { select: { username: true } },
      },
    });

    // Handle splits
    if (purchased && splitWith && Array.isArray(splitWith)) {
      // Delete existing splits
      await prisma.shoppingItemSplit.deleteMany({
        where: { itemId },
      });

      // Create new splits
      if (splitWith.length > 0) {
        await prisma.shoppingItemSplit.createMany({
          data: splitWith.map((userId: string) => ({
            itemId,
            userId,
          })),
        });
      }
    } else if (!purchased) {
      // Remove splits when unpurchasing
      await prisma.shoppingItemSplit.deleteMany({
        where: { itemId },
      });
    }

    // Fetch splits for response
    const splits = await prisma.shoppingItemSplit.findMany({
      where: { itemId },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      addedBy: updated.addedBy.username,
      addedById: updated.addedById,
      createdAt: updated.createdAt.toISOString(),
      purchased: updated.purchased,
      purchasedBy: updated.purchasedBy?.username,
      purchasedById: updated.purchasedById,
      purchasedAt: updated.purchasedAt?.toISOString(),
      price: updated.price ? parseFloat(updated.price.toString()) : undefined,
      splitWith: splits.map((s) => s.userId),
    });
  } catch (error) {
    logger.error("SHOPPING", "Purchase item error", { error: String(error), itemId });
    res.status(500).json({ message: "Chyba" });
  }
});

// Legacy endpoint — delegates to the main handler
router.put(
  "/:listId/items/:itemId/purchase",
  protect,
  async (req: Request, res: Response) => {
    // Rewrite params so the main handler sees itemId
    req.params = { ...req.params, itemId: req.params.itemId };
    // Forward to the actual purchase handler below
    const handler = router.stack.find(
      (layer: any) => layer.route?.path === "/:itemId/purchase" && layer.route?.methods?.put
    );
    if (handler) {
      return handler.route!.stack[0].handle(req, res, () => { });
    }
    res.status(404).json({ message: "Not found" });
  }
);

// ============================================================================
//                          DELETE ITEM
// ============================================================================
async function deleteItem(req: Request, res: Response) {
  const { itemId } = req.params;
  try {
    await prisma.shoppingListItem.delete({
      where: { id: itemId },
    });
    res.json({ success: true });
  } catch (error) {
    logger.error("SHOPPING", "Delete item error", { error: String(error), itemId });
    res.status(500).json({ message: "Chyba" });
  }
}

router.delete("/:itemId", protect, deleteItem);

// Legacy endpoint — same handler, just different path pattern
router.delete("/:listId/items/:itemId", protect, deleteItem);

export default router;
