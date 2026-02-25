import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";

const router = Router();

// ============================================================================
//                           GET ALL INVENTORY ITEMS
// ============================================================================
router.get("/", protect, async (_req: Request, res: Response) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: { updatedBy: { select: { id: true, username: true } } },
    });
    res.json(items);
  } catch (error) {
    logger.error("INVENTORY", "Failed to fetch inventory items", { error: String(error) });
    res.status(500).json({ error: "Nepodařilo se načíst zásoby." });
  }
});

// ============================================================================
//                           CREATE INVENTORY ITEM
// ============================================================================
router.post("/", protect, async (req: Request, res: Response) => {
  try {
    const { name, category, status, location } = req.body;
    // @ts-ignore
    const userId: string = req.user.userId;

    if (!name || String(name).trim() === "") {
      return res.status(400).json({ error: "Název zásoby je povinný." });
    }
    if (String(name).trim().length > 100) {
      return res.status(400).json({ error: "Název je příliš dlouhý (max 100 znaků)." });
    }

    const validStatuses = ["OK", "LOW", "EMPTY"];
    const safeStatus = validStatuses.includes(status) ? status : "OK";

    const item = await prisma.inventoryItem.create({
      data: {
        name: String(name).trim(),
        category: category ? String(category).trim() : "OSTATNÍ",
        status: safeStatus,
        location: location ? String(location).trim() || null : null,
        updatedById: userId,
      },
      include: { updatedBy: { select: { id: true, username: true } } },
    });

    res.status(201).json(item);
  } catch (error) {
    logger.error("INVENTORY", "Failed to create inventory item", { error: String(error) });
    res.status(500).json({ error: "Nepodařilo se vytvořit zásobu." });
  }
});

// ============================================================================
//                           UPDATE INVENTORY ITEM
// ============================================================================
router.put("/:id", protect, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, status, location } = req.body;
    // @ts-ignore
    const userId: string = req.user.userId;

    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Zásoba nenalezena." });
    }

    const validStatuses = ["OK", "LOW", "EMPTY"];

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(category !== undefined && { category: String(category).trim() }),
        ...(status !== undefined && validStatuses.includes(status) && { status }),
        ...(location !== undefined && { location: String(location).trim() || null }),
        updatedById: userId,
      },
      include: { updatedBy: { select: { id: true, username: true } } },
    });

    res.json(updated);
  } catch (error) {
    logger.error("INVENTORY", "Failed to update inventory item", { error: String(error) });
    res.status(500).json({ error: "Nepodařilo se aktualizovat zásobu." });
  }
});

// ============================================================================
//                           DELETE INVENTORY ITEM
// ============================================================================
router.delete("/:id", protect, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Zásoba nenalezena." });
    }

    await prisma.inventoryItem.delete({ where: { id } });
    res.json({ message: "Zásoba smazána." });
  } catch (error) {
    logger.error("INVENTORY", "Failed to delete inventory item", { error: String(error) });
    res.status(500).json({ error: "Nepodařilo se smazat zásobu." });
  }
});

// ============================================================================
//                    ADD INVENTORY ITEM TO SHOPPING CART
// POST /:id/add-to-cart — Finds or creates an open shopping list named
// "Doplnění zásob", adds a ShoppingListItem linked to this InventoryItem,
// and marks the InventoryItem as inCart: true — all within a transaction.
// ============================================================================
router.post("/:id/add-to-cart", protect, async (req: Request, res: Response) => {
  const { id } = req.params;
  // @ts-ignore
  const userId: string = req.user.userId;

  try {
    const invItem = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!invItem) {
      return res.status(404).json({ error: "Zásoba nenalezena." });
    }
    if (invItem.inCart) {
      return res.status(409).json({ error: "Položka je již přidána do nákupu." });
    }

    await prisma.$transaction(async (tx) => {
      // Find or create the "Doplnění zásob" list
      let list = await tx.shoppingList.findFirst({
        where: { isPantry: false, isResolved: false, name: "Doplnění zásob" },
      });

      if (!list) {
        list = await tx.shoppingList.create({
          data: {
            name: "Doplnění zásob",
            createdById: userId,
          },
        });
      }

      // Add the item linked to this inventory entry
      await tx.shoppingListItem.create({
        data: {
          name: invItem.name,
          listId: list.id,
          addedById: userId,
          linkedInventoryId: invItem.id,
        },
      });

      // Mark as in-cart
      await tx.inventoryItem.update({
        where: { id },
        data: { inCart: true },
      });
    });

    res.json({ message: "Přidáno do nákupního seznamu." });
  } catch (error) {
    logger.error("INVENTORY", "Failed to add inventory item to cart", { error: String(error) });
    res.status(500).json({ error: "Nepodařilo se přidat do nákupu." });
  }
});

// ============================================================================
//  GET /missing-summary — počet LOW/EMPTY zásob pro post-rezervační notifikaci
// ============================================================================
router.get("/missing-summary", protect, async (_req: Request, res: Response) => {
  try {
    const [missingInventory, pendingShoppingCount] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: { status: { in: ["LOW", "EMPTY"] } },
        select: { id: true, name: true, status: true },
        orderBy: { status: "asc" }, // EMPTY první
      }),
      prisma.shoppingListItem.count({
        where: {
          purchased: false,
          list: { isResolved: false, isPantry: false },
        },
      }),
    ]);

    res.json({
      count: missingInventory.length,
      items: missingInventory.map((i) => ({ name: i.name, status: i.status })),
      hasShoppingItems: pendingShoppingCount > 0,
      pendingShoppingCount,
    });
  } catch (err) {
    logger.error("INVENTORY", "Missing summary error", { error: String(err) });
    res.status(500).json({ message: "Chyba při načítání souhrnu." });
  }
});

export default router;
