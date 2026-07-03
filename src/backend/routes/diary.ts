import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import { requireCabin } from "../../middleware/cabinMiddleware";
import { validate } from "../../validators/validate";
import { createDiaryFolderSchema, renameDiaryFolderSchema, createDiaryEntrySchema, updateDiaryEntrySchema } from "../../validators/schemas";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";
import { emitToCabin } from "../../utils/socket";
import { PrismaClient } from "../../generated/prisma/client.js";

const router = Router();

// ============================================================================
//                         GET ALL FOLDERS
// ============================================================================
router.get("/folders", protect, requireCabin, async (req: Request, res: Response) => {
  try {
    const folders = await prisma.diaryFolder.findMany({
      where: { cabinId: req.user!.cabinId },
      include: {
        createdBy: {
          select: {
            username: true,
          },
        },
        entries: {
          select: {
            photos: {
              select: {
                photoId: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formatted = folders.map((folder) => {
      const entryCount = folder.entries.length;
      const uniquePhotoIds = new Set(
        folder.entries.flatMap((entry) => entry.photos.map((p) => p.photoId))
      );

      return {
        id: folder.id,
        name: folder.name,
        activityTag: folder.activityTag,
        createdAt: folder.createdAt.toISOString(),
        createdBy: folder.createdBy.username,
        startDate: folder.startDate?.toISOString().split("T")[0],
        endDate: folder.endDate?.toISOString().split("T")[0],
        stats: {
          entries: entryCount,
          photos: uniquePhotoIds.size,
        },
      };
    });

    res.json(formatted);
  } catch (error) {
    logger.error("DIARY", "Get diary folders error", { error: String(error) });
    res.status(500).json({ message: "Chyba při načítání deníku." });
  }
});

// ============================================================================
//                          CREATE FOLDER
// ============================================================================
router.post("/folders", protect, requireCabin, validate(createDiaryFolderSchema), async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  const { name, startDate, endDate, activityTag } = req.body;

  try {
    const newFolder = await prisma.diaryFolder.create({
      data: {
        name,
        activityTag: activityTag || null,
        createdById: req.user.userId,
        cabinId: req.user.cabinId!,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      include: {
        createdBy: {
          select: {
            username: true,
          },
        },
      },
    });

    emitToCabin(req.user!.cabinId!, "diary:changed", { folderId: newFolder.id });
    res.status(201).json({
      id: newFolder.id,
      name: newFolder.name,
      activityTag: newFolder.activityTag,
      createdAt: newFolder.createdAt.toISOString(),
      createdBy: newFolder.createdBy.username,
      startDate: newFolder.startDate?.toISOString().split("T")[0],
      endDate: newFolder.endDate?.toISOString().split("T")[0],
      stats: { entries: 0, photos: 0 },
    });
  } catch (error) {
    logger.error("DIARY", "Create diary folder error", { error: String(error) });
    res.status(500).json({ message: "Chyba při vytváření složky." });
  }
});

// ============================================================================
//                          RENAME FOLDER
// ============================================================================
router.patch("/folders/:id", protect, requireCabin, validate(renameDiaryFolderSchema), async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  const { id } = req.params;
  const { name: newName, activityTag } = req.body;

  try {
    const folder = await prisma.diaryFolder.findFirst({
      where: { id, cabinId: req.user!.cabinId },
      include: {
        createdBy: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!folder) {
      return res.status(404).json({ message: "Deník nenalezen." });
    }

    if (req.user!.role !== "admin" && folder.createdBy.id !== req.user!.userId) {
      return res.status(403).json({ message: "Nemáte oprávnění přejmenovat tento deník." });
    }

    const updated = await prisma.diaryFolder.update({
      where: { id },
      data: {
        name: newName.trim(),
        ...(activityTag !== undefined ? { activityTag: activityTag || null } : {})
      },
      include: {
        createdBy: {
          select: {
            username: true,
          },
        },
      },
    });

    emitToCabin(req.user!.cabinId!, "diary:changed", { folderId: updated.id });
    res.json({
      message: "Deník úspěšně přejmenován.",
      folder: {
        id: updated.id,
        name: updated.name,
        activityTag: updated.activityTag,
        createdAt: updated.createdAt.toISOString(),
        createdBy: updated.createdBy.username,
        startDate: updated.startDate?.toISOString().split("T")[0],
        endDate: updated.endDate?.toISOString().split("T")[0],
      },
    });
  } catch (error) {
    logger.error("DIARY", "Rename diary folder error", { error: String(error), id });
    res.status(500).json({ message: "Chyba při přejmenování deníku." });
  }
});

// ============================================================================
//                          DELETE FOLDER
// ============================================================================
router.delete("/folders/:id", protect, requireCabin, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  const { id } = req.params;

  try {
    const folder = await prisma.diaryFolder.findFirst({
      where: { id, cabinId: req.user.cabinId },
      include: {
        createdBy: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!folder) {
      return res.status(404).json({ message: "Složka nenalezena." });
    }

    if (req.user.role !== "admin" && folder.createdBy.id !== req.user.userId) {
      return res.status(403).json({ message: "Nemáte oprávnění smazat toto období." });
    }

    // Delete folder (cascade will delete entries)
    await prisma.diaryFolder.delete({
      where: { id },
    });

    emitToCabin(req.user!.cabinId!, "diary:changed", { folderId: id });
    res.json({ message: "Složka a záznamy smazány." });
  } catch (error) {
    logger.error("DIARY", "Delete diary folder error", { error: String(error), id });
    res.status(500).json({ message: "Chyba při mazání složky." });
  }
});

// ============================================================================
//                           GET ENTRIES
// ============================================================================
router.get("/entries", protect, requireCabin, async (req: Request, res: Response) => {
  const { folderId } = req.query;

  try {
    // Always scope entries to user's cabin
    let where: any;
    if (folderId) {
      // Verify folder belongs to user's cabin
      const folder = await prisma.diaryFolder.findFirst({
        where: { id: folderId as string, cabinId: req.user!.cabinId },
      });
      if (!folder) {
        return res.status(404).json({ message: "Složka nenalezena." });
      }
      where = { folderId: folderId as string };
    } else {
      // No folderId — scope to all entries in user's cabin
      where = { folder: { cabinId: req.user!.cabinId } };
    }

    const entries = await prisma.diaryEntry.findMany({
      where,
      include: {
        author: {
          select: {
            username: true,
          },
        },
        photos: {
          include: {
            photo: true,
          },
        },
      },
      orderBy: {
        entryDate: "desc",
      },
    });

    const formatted = entries.map((entry) => ({
      id: entry.id,
      folderId: entry.folderId,
      date: entry.entryDate.toISOString().split("T")[0],
      content: entry.content,
      author: entry.author.username,
      authorId: entry.authorId,
      createdAt: entry.createdAt.toISOString(),
      galleryPhotoIds: entry.photos.map((p) => p.photoId),
    }));

    res.json(formatted);
  } catch (error) {
    logger.error("DIARY", "Get diary entries error", { error: String(error) });
    res.status(500).json({ message: "Chyba." });
  }
});

// ============================================================================
//                          CREATE ENTRY
// ============================================================================
router.post("/entries", protect, requireCabin, validate(createDiaryEntrySchema), async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  const { folderId, date, content, galleryPhotoIds } = req.body;

  try {
    // Verify folder belongs to user's cabin
    const folder = await prisma.diaryFolder.findFirst({
      where: { id: folderId, cabinId: req.user!.cabinId },
    });
    if (!folder) {
      return res.status(404).json({ message: "Složka nenalezena." });
    }

    const newEntry = await prisma.diaryEntry.create({
      data: {
        folderId,
        authorId: req.user.userId,
        entryDate: new Date(date),
        content,
        photos: {
          create:
            galleryPhotoIds?.map((photoId: string) => ({
              photoId,
            })) || [],
        },
      },
      include: {
        author: {
          select: {
            username: true,
          },
        },
        photos: {
          include: {
            photo: true,
          },
        },
      },
    });

    emitToCabin(req.user!.cabinId!, "diary:changed", { folderId: newEntry.folderId });
    res.status(201).json({
      id: newEntry.id,
      folderId: newEntry.folderId,
      date: newEntry.entryDate.toISOString().split("T")[0],
      content: newEntry.content,
      author: newEntry.author.username,
      authorId: newEntry.authorId,
      createdAt: newEntry.createdAt.toISOString(),
      galleryPhotoIds: newEntry.photos.map((p) => p.photoId),
    });
  } catch (error) {
    logger.error("DIARY", "Create diary entry error", { error: String(error) });
    res.status(500).json({ message: "Chyba při ukládání záznamu." });
  }
});

// ============================================================================
//                          UPDATE ENTRY (PUT)
// ============================================================================
router.put("/entries/:id", protect, requireCabin, validate(updateDiaryEntrySchema), async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  const { id } = req.params;
  const { content, galleryPhotoIds } = req.body;

  try {
    const existing = await prisma.diaryEntry.findUnique({
      where: { id },
      include: { folder: { select: { cabinId: true } } },
    });
    if (!existing || existing.folder.cabinId !== req.user!.cabinId) {
      return res.status(404).json({ message: "Záznam nenalezen." });
    }
    if (req.user.role !== "admin" && existing.authorId !== req.user.userId) {
      return res.status(403).json({ message: "Nemáte oprávnění upravit tento záznam." });
    }

    // Update content + replace photo associations in a transaction
    const updated = await prisma.$transaction(async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => {
      // Delete old photo associations
      await tx.diaryEntryPhoto.deleteMany({ where: { entryId: id } });

      // Update entry and create new photo associations
      return tx.diaryEntry.update({
        where: { id },
        data: {
          content,
          photos: {
            create:
              galleryPhotoIds?.map((photoId: string) => ({
                photoId,
              })) || [],
          },
        },
        include: {
          author: { select: { username: true } },
          photos: { include: { photo: true } },
        },
      });
    });

    emitToCabin(req.user!.cabinId!, "diary:changed", { folderId: updated.folderId });
    res.json({
      id: updated.id,
      folderId: updated.folderId,
      date: updated.entryDate.toISOString().split("T")[0],
      content: updated.content,
      author: updated.author.username,
      authorId: updated.authorId,
      createdAt: updated.createdAt.toISOString(),
      galleryPhotoIds: updated.photos.map((p) => p.photoId),
    });
  } catch (error) {
    logger.error("DIARY", "Update diary entry error", { error: String(error), id });
    res.status(500).json({ message: "Chyba při aktualizaci záznamu." });
  }
});

// ============================================================================
//                          DELETE ENTRY
// ============================================================================
router.delete("/entries/:id", protect, requireCabin, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  const { id } = req.params;

  try {
    const entry = await prisma.diaryEntry.findUnique({
      where: { id },
      include: { folder: { select: { cabinId: true } } },
    });

    if (!entry || entry.folder.cabinId !== req.user!.cabinId) {
      return res.status(404).json({ message: "Záznam nenalezen." });
    }

    if (req.user.role !== "admin" && entry.authorId !== req.user.userId) {
      return res.status(403).json({ message: "Nemáte oprávnění smazat tento záznam." });
    }

    await prisma.diaryEntry.delete({
      where: { id },
    });

    emitToCabin(req.user!.cabinId!, "diary:changed", { folderId: entry.folderId });
    res.json({ message: "Záznam smazán." });
  } catch (error) {
    logger.error("DIARY", "Delete diary entry error", { error: String(error), id });
    res.status(500).json({ message: "Chyba při mazání záznamu." });
  }
});

export default router;
