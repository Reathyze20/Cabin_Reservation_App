import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import { requireCabin } from "../../middleware/cabinMiddleware";
import { validate } from "../../validators/validate";
import { createShoppingItemSchema, updateItemStatusSchema } from "../../validators/schemas";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";

const router = Router();

// ============================================================================
//                      GET SHOPPING LISTS
// ============================================================================
router.get("/", protect, requireCabin, async (req: Request, res: Response) => {
  try {
    const items = await prisma.shoppingListItem.findMany({
      where: {
        list: { cabinId: req.user!.cabinId },
      },
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
      status: item.status,
      purchased: item.purchased,
      purchasedBy: item.purchasedBy?.username,
      purchasedById: item.purchasedById,
      purchasedAt: item.purchasedAt?.toISOString(),
      price: item.price ? parseFloat(item.price.toString()) : undefined,
      splitWith: item.splits.map((s) => s.userId),
      isEssential: item.isEssential,
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
router.post("/", protect, requireCabin, async (req: Request, res: Response) => {
  res.status(200).json({ id: "default", name: "Hlavní seznam", items: [] });
});

// ============================================================================
//                        ADD ITEM TO LIST
// ============================================================================
router.post("/:listId/items", protect, requireCabin, validate(createShoppingItemSchema), async (req: Request, res: Response) => {
  const { name, isEssential, sourceMessageId } = req.body;
  const { listId } = req.params;

  try {
    // Verify list belongs to user's cabin
    if (listId !== "default") {
      const list = await prisma.shoppingList.findFirst({ where: { id: listId, cabinId: req.user!.cabinId } });
      if (!list) return res.status(404).json({ message: "Seznam nenalezen." });
    }

    const newItem = await prisma.shoppingListItem.create({
      data: {
        name,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        addedById: req.user.userId,
        listId: listId === "default" ? null : listId, // For legacy / transition
        isEssential: Boolean(isEssential ?? false),
        sourceMessageId: sourceMessageId || null,
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
      isEssential: newItem.isEssential,
    });
  } catch (error) {
    logger.error("SHOPPING", "Add item error", { error: String(error) });
    res.status(500).json({ message: "Chyba" });
  }
});

// ============================================================================
//                    MARK ITEM AS PURCHASED / UPDATE STATUS
// ============================================================================
router.put("/:itemId/purchase", protect, requireCabin, validate(updateItemStatusSchema), async (req: Request, res: Response) => {
  const { itemId } = req.params;
  // Accept either new `status` enum or legacy boolean `purchased`
  let { status, purchased, price, splitWith } = req.body;

  // Map legacy boolean → enum
  if (status === undefined && purchased !== undefined) {
    status = purchased ? "purchased" : "pending";
  }

  const validStatuses = ["pending", "bring_from_home", "purchased"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Neplatný status položky." });
  }

  const isPurchased = status === "purchased";

  try {
    // Verify item's list belongs to user's cabin
    const item = await prisma.shoppingListItem.findUnique({
      where: { id: itemId },
      include: { list: { select: { cabinId: true } } },
    });
    if (!item || (item.list && item.list.cabinId !== req.user!.cabinId)) {
      return res.status(404).json({ message: "Položka nenalezena." });
    }

    // Use transaction — update item + restock linked inventory + handle splits
    const { updated, splits } = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.shoppingListItem.update({
        where: { id: itemId },
        data: {
          status,
          purchased: isPurchased,
          ...(isPurchased
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

      // Auto-restock: if purchased and linked to inventory → set OK + remove from cart
      if (isPurchased && updatedItem.linkedInventoryId) {
        await tx.inventoryItem.update({
          where: { id: updatedItem.linkedInventoryId },
          data: { status: "OK", inCart: false },
        });
      }

      // Handle splits
      if (isPurchased && splitWith && Array.isArray(splitWith)) {
        await tx.shoppingItemSplit.deleteMany({ where: { itemId } });
        if (splitWith.length > 0) {
          await tx.shoppingItemSplit.createMany({
            data: splitWith.map((userId: string) => ({ itemId, userId })),
          });
        }
      } else if (!isPurchased) {
        await tx.shoppingItemSplit.deleteMany({ where: { itemId } });
      }

      const itemSplits = await tx.shoppingItemSplit.findMany({ where: { itemId } });
      return { updated: updatedItem, splits: itemSplits };
    });

    res.json({
      id: updated.id,
      name: updated.name,
      addedBy: updated.addedBy.username,
      addedById: updated.addedById,
      createdAt: updated.createdAt.toISOString(),
      status: updated.status,
      purchased: updated.purchased,
      purchasedBy: updated.purchasedBy?.username,
      purchasedById: updated.purchasedById,
      purchasedAt: updated.purchasedAt?.toISOString(),
      price: updated.price ? parseFloat(updated.price.toString()) : undefined,
      splitWith: splits.map((s) => s.userId),
      isEssential: updated.isEssential,
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
  requireCabin,
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
//                 MOVE ITEM FROM PANTRY TO LATEST SHOPPING LIST
// ============================================================================
router.post("/:itemId/move-from-pantry", protect, requireCabin, async (req: Request, res: Response) => {
  const { itemId } = req.params;

  try {
    const item = await prisma.shoppingListItem.findUnique({
      where: { id: itemId },
      include: { list: { select: { cabinId: true } } },
    });
    if (!item || (item.list && item.list.cabinId !== req.user!.cabinId)) {
      return res.status(404).json({ message: "Položka nenalezena." });
    }

    // Najdi nejnovější normální (ne-pantry) nákupní seznam v rámci cabin
    let targetList = await prisma.shoppingList.findFirst({
      where: { isResolved: false, isPantry: false, cabinId: req.user!.cabinId },
      orderBy: { createdAt: "desc" }
    });

    if (!targetList) {
      // Vytvoř nový, pokud žádný není
      targetList = await prisma.shoppingList.create({
        data: {
          name: "Aktuální nákup",
          // @ts-ignore
          createdById: req.user.userId,
          cabinId: req.user!.cabinId!,
        }
      });
    }

    const updated = await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: {
        listId: targetList.id,
        status: "pending",
        purchased: false,
        purchasedById: null,
        purchasedAt: null,
        price: null,
      },
      include: { addedBy: { select: { username: true } } },
    });

    await prisma.shoppingItemSplit.deleteMany({ where: { itemId } });

    res.json({ message: "Přesunuto", listId: targetList.id });
  } catch (error) {
    logger.error("SHOPPING", "Move from pantry error", { error: String(error), itemId });
    res.status(500).json({ message: "Chyba" });
  }
});

// ============================================================================
//                 TOGGLE isEssential ON SHOPPING ITEM
// ============================================================================
router.patch("/:itemId/toggle-essential", protect, requireCabin, async (req: Request, res: Response) => {
  const { itemId } = req.params;
  try {
    // @ts-ignore
    const role: string = req.user.role;
    if (role === "guest") {
      return res.status(403).json({ message: "Hosté nemohou měnit kritické položky." });
    }

    const item = await prisma.shoppingListItem.findUnique({
      where: { id: itemId },
      include: { list: { select: { cabinId: true } } },
    });
    if (!item || (item.list && item.list.cabinId !== req.user!.cabinId)) {
      return res.status(404).json({ message: "Položka nenalezena." });
    }

    const updated = await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: { isEssential: !item.isEssential },
    });

    res.json({ id: updated.id, isEssential: updated.isEssential });
  } catch (error) {
    logger.error("SHOPPING", "Toggle essential error", { error: String(error), itemId });
    res.status(500).json({ message: "Chyba" });
  }
});

// ============================================================================
//                          DELETE ITEM
// ============================================================================
async function deleteItem(req: Request, res: Response) {
  const { itemId } = req.params;
  try {
    // Fetch the item and verify it belongs to user's cabin
    const item = await prisma.shoppingListItem.findUnique({
      where: { id: itemId },
      select: { linkedInventoryId: true, list: { select: { cabinId: true } } },
    });

    if (!item || (item.list && item.list.cabinId !== req.user!.cabinId)) {
      return res.status(404).json({ message: "Položka nenalezena" });
    }

    // Delete the item and reset linked inventory in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.shoppingListItem.delete({ where: { id: itemId } });

      // If linked to inventory, reset inCart flag so it shows as "not in cart" again
      if (item.linkedInventoryId) {
        await tx.inventoryItem.update({
          where: { id: item.linkedInventoryId },
          data: { inCart: false },
        });
      }
    });

    res.json({ success: true });
  } catch (error) {
    logger.error("SHOPPING", "Delete item error", { error: String(error), itemId });
    res.status(500).json({ message: "Chyba" });
  }
}

router.delete("/:itemId", protect, requireCabin, deleteItem);

// Legacy endpoint — same handler, just different path pattern
router.delete("/:listId/items/:itemId", protect, requireCabin, deleteItem);

export default router;
