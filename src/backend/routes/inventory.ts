import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import { requireCabin } from "../../middleware/cabinMiddleware";
import { validate } from "../../validators/validate";
import { createInventoryItemSchema, updateInventoryItemSchema, addToCartSchema } from "../../validators/schemas";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";
import { emitToCabin } from "../../utils/socket";

const router = Router();

// ============================================================================
//                           GET ALL INVENTORY ITEMS
// ============================================================================
router.get("/", protect, requireCabin, async (_req: Request, res: Response) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { cabinId: _req.user!.cabinId },
      orderBy: [{ isEssential: "desc" }, { category: "asc" }, { name: "asc" }],
      include: { updatedBy: { select: { id: true, username: true } } },
    });
    res.json(items);
  } catch (error) {
    logger.error("INVENTORY", "Failed to fetch inventory items", { error: String(error) });
    res.status(500).json({ message: "NepodaĹ™ilo se naÄŤĂ­st zĂˇsoby." });
  }
});

// ============================================================================
//                           CREATE INVENTORY ITEM
// ============================================================================
router.post("/", protect, requireCabin, validate(createInventoryItemSchema), async (req: Request, res: Response) => {
  try {
    const { name, category, status, location, isEssential } = req.body;
    const userId = req.user!.userId;

    const validStatuses = ["OK", "LOW", "EMPTY"];
    const safeStatus = validStatuses.includes(status) ? status : "OK";

    const item = await prisma.inventoryItem.create({
      data: {
        name: String(name).trim(),
        category: category ? String(category).trim() : "OSTATNĂŤ",
        status: safeStatus,
        location: location ? String(location).trim() || null : null,
        isEssential: Boolean(isEssential),
        updatedById: userId,
        cabinId: req.user!.cabinId!,
      },
      include: { updatedBy: { select: { id: true, username: true } } },
    });

    emitToCabin(req.user!.cabinId!, "inventory:created", item);
    res.status(201).json(item);
  } catch (error) {
    logger.error("INVENTORY", "Failed to create inventory item", { error: String(error) });
    res.status(500).json({ message: "NepodaĹ™ilo se vytvoĹ™it zĂˇsobu." });
  }
});

// ============================================================================
//                           UPDATE INVENTORY ITEM
// ============================================================================
router.put("/:id", protect, requireCabin, validate(updateInventoryItemSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, status, location, isEssential } = req.body;
    const userId = req.user!.userId;

    const existing = await prisma.inventoryItem.findFirst({ where: { id, cabinId: req.user!.cabinId } });
    if (!existing) {
      return res.status(404).json({ message: "PoloĹľka nenalezena." });
    }

    const validStatuses = ["OK", "LOW", "EMPTY"];

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(category !== undefined && { category: String(category).trim() }),
        ...(status !== undefined && validStatuses.includes(status) && { status }),
        ...(location !== undefined && { location: location == null ? null : String(location).trim() || null }),
        ...(isEssential !== undefined && { isEssential: Boolean(isEssential) }),
        updatedById: userId,
      },
      include: { updatedBy: { select: { id: true, username: true } } },
    });

    emitToCabin(req.user!.cabinId!, "inventory:updated", updated);
    res.json(updated);
  } catch (error) {
    logger.error("INVENTORY", "Failed to update inventory item", { error: String(error) });
    res.status(500).json({ message: "NepodaĹ™ilo se aktualizovat zĂˇsobu." });
  }
});

// ============================================================================
//                    TOGGLE isEssential ON INVENTORY ITEM
// PATCH /:id/toggle-essential
// ============================================================================
router.patch("/:id/toggle-essential", protect, requireCabin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const role = req.user!.role;
    if (role === "guest") {
      return res.status(403).json({ message: "HostĂ© nemohou mÄ›nit kritickĂ© poloĹľky." });
    }

    const item = await prisma.inventoryItem.findFirst({ where: { id, cabinId: req.user!.cabinId } });
    if (!item) {
      return res.status(404).json({ message: "PoloĹľka nenalezena." });
    }

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: { isEssential: !item.isEssential },
      include: { updatedBy: { select: { id: true, username: true } } },
    });

    emitToCabin(req.user!.cabinId!, "inventory:updated", updated);
    res.json(updated);
  } catch (error) {
    logger.error("INVENTORY", "Failed to toggle essential", { error: String(error) });
    res.status(500).json({ message: "NepodaĹ™ilo se zmÄ›nit stav kritickĂ© poloĹľky." });
  }
});

// ============================================================================
//                           DELETE INVENTORY ITEM
// ============================================================================
router.delete("/:id", protect, requireCabin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.inventoryItem.findFirst({ where: { id, cabinId: req.user!.cabinId } });
    if (!existing) {
      return res.status(404).json({ message: "PoloĹľka nenalezena." });
    }

    await prisma.inventoryItem.delete({ where: { id } });
    emitToCabin(req.user!.cabinId!, "inventory:deleted", { id });
    res.json({ message: "PoloĹľka smazĂˇna." });
  } catch (error) {
    logger.error("INVENTORY", "Failed to delete inventory item", { error: String(error) });
    res.status(500).json({ message: "NepodaĹ™ilo se smazat zĂˇsobu." });
  }
});

// ============================================================================
//                    ADD INVENTORY ITEM TO SHOPPING CART
// POST /:id/add-to-cart
// Body: { listId?: string } â€” pĹ™idat do existujĂ­cĂ­ho seznamu
//       { newListName?: string } â€” vytvoĹ™it novĂ˝ seznam a pĹ™idat
// ============================================================================
router.post("/:id/add-to-cart", protect, requireCabin, validate(addToCartSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { listId, newListName } = req.body;
  const userId = req.user!.userId;

  try {
    if (!listId && !newListName) {
      return res.status(400).json({ message: "Zadejte existujĂ­cĂ­ seznam nebo nĂˇzev novĂ©ho." });
    }
    if (newListName && String(newListName).trim().length > 100) {
      return res.status(400).json({ message: "NĂˇzev seznamu je pĹ™Ă­liĹˇ dlouhĂ˝ (max 100 znakĹŻ)." });
    }

    const invItem = await prisma.inventoryItem.findFirst({ where: { id, cabinId: req.user!.cabinId } });
    if (!invItem) {
      return res.status(404).json({ message: "PoloĹľka nenalezena." });
    }
    if (invItem.inCart) {
      return res.status(409).json({ message: "PoloĹľka je jiĹľ pĹ™idĂˇna do nĂˇkupu." });
    }

    await prisma.$transaction(async (tx) => {
      let targetListId: string;

      if (listId) {
        // a) OvÄ›Ĺ™ existenci a Ĺľe seznam je aktivnĂ­
        const existing = await tx.shoppingList.findFirst({ where: { id: listId, cabinId: req.user!.cabinId } });
        if (!existing || existing.isResolved) {
          throw new Error("Seznam nenalezen nebo je archivovanĂ˝.");
        }
        targetListId = existing.id;
      } else {
        // b) VytvoĹ™ novĂ˝ seznam
        const created = await tx.shoppingList.create({
          data: {
            name: String(newListName).trim(),
            createdById: userId,
            cabinId: req.user!.cabinId!,
          },
        });
        targetListId = created.id;
      }

      // VloĹľ poloĹľku propojenou se zĂˇsobou
      await tx.shoppingListItem.create({
        data: {
          name: invItem.name,
          listId: targetListId,
          addedById: userId,
          linkedInventoryId: invItem.id,
          isEssential: invItem.isEssential,
        },
      });

      // OznaÄŤ zĂˇsobu jako in-cart
      await tx.inventoryItem.update({
        where: { id },
        data: { inCart: true },
      });
    });

    emitToCabin(req.user!.cabinId!, "inventory:updated", { id });
    emitToCabin(req.user!.cabinId!, "shopping:item:added", { linkedInventoryId: id });
    res.json({ message: "PĹ™idĂˇno do nĂˇkupnĂ­ho seznamu." });
  } catch (error) {
    logger.error("INVENTORY", "Failed to add inventory item to cart", { error: String(error) });
    res.status(500).json({ message: "NepodaĹ™ilo se pĹ™idat do nĂˇkupu." });
  }
});

// ============================================================================
//  GET /missing-summary â€” poÄŤet LOW/EMPTY zĂˇsob pro post-rezervaÄŤnĂ­ notifikaci
// ============================================================================
router.get("/missing-summary", protect, requireCabin, async (_req: Request, res: Response) => {
  try {
    const cabinId = _req.user!.cabinId!;
    const [missingInventory, pendingShoppingCount] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: { cabinId, status: { in: ["LOW", "EMPTY"] } },
        select: { id: true, name: true, status: true },
        orderBy: { status: "asc" }, // EMPTY prvnĂ­
      }),
      prisma.shoppingListItem.count({
        where: {
          purchased: false,
          list: { isResolved: false, isPantry: false, cabinId },
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
    res.status(500).json({ message: "Chyba pĹ™i naÄŤĂ­tĂˇnĂ­ souhrnu." });
  }
});

export default router;

