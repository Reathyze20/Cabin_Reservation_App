import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import { requireCabin } from "../../middleware/cabinMiddleware";
import { validate } from "../../validators/validate";
import { createFolderSchema, renameFolderSchema, updatePhotoDescriptionSchema, bulkDeletePhotosSchema } from "../../validators/schemas";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";
import { emitToCabin } from "../../utils/socket";
import { UPLOADS_PATH, THUMBS_PATH } from "../../config/config";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import sharp from "sharp";

const router = Router();
const uploadsPath = UPLOADS_PATH;
const thumbsPath = THUMBS_PATH;

// Ensure uploads directories exist
for (const dir of [uploadsPath, thumbsPath]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Multer config — store in memory, then process with sharp
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB per file
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Pouze obrázky jsou povoleny."));
    }
  },
});

// ============================================================================
//                         GET ALL FOLDERS
// ============================================================================
router.get("/folders", protect, requireCabin, async (req: Request, res: Response) => {
  try {
    const folders = await prisma.galleryFolder.findMany({
      where: { cabinId: req.user!.cabinId },
      include: {
        createdBy: {
          select: {
            username: true,
          },
        },
        photos: {
          select: { src: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: { photos: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formatted = folders.map((folder) => {
      const latestPhoto = folder.photos[0];
      const thumbFileName = latestPhoto?.src.split("/uploads/")[1];
      return {
        id: folder.id,
        name: folder.name,
        photoCount: folder._count.photos,
        coverPhotoUrl: thumbFileName ? `/uploads/thumbs/${thumbFileName}` : null,
        createdAt: folder.createdAt.toISOString(),
        createdBy: folder.createdBy?.username,
      };
    });

    res.json(formatted);
  } catch (error) {
    logger.error("GALLERY", "Get folders error", { error: String(error) });
    res.status(500).json({ message: "Chyba při načítání složek." });
  }
});

// ============================================================================
//                          CREATE FOLDER
// ============================================================================
router.post("/folders", protect, requireCabin, validate(createFolderSchema), async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  const { name } = req.body;

  try {
    const existing = await prisma.galleryFolder.findFirst({
      where: { name: name.trim(), cabinId: req.user!.cabinId },
    });

    if (existing) {
      return res.status(409).json({ message: "Složka s tímto názvem již existuje." });
    }

    const newFolder = await prisma.galleryFolder.create({
      data: {
        name: name.trim(),
        createdById: req.user.userId,
        cabinId: req.user.cabinId!,
      },
      include: {
        createdBy: {
          select: {
            username: true,
          },
        },
      },
    });

    emitToCabin(req.user!.cabinId!, "gallery:changed", { folderId: newFolder.id });
    res.status(201).json({
      id: newFolder.id,
      name: newFolder.name,
      createdAt: newFolder.createdAt.toISOString(),
      createdBy: newFolder.createdBy?.username,
    });
  } catch (error) {
    logger.error("GALLERY", "Create folder error", { error: String(error) });
    res.status(500).json({ message: "Chyba při vytváření složky." });
  }
});

// ============================================================================
//                          RENAME FOLDER
// ============================================================================
router.patch("/folders/:id", protect, requireCabin, validate(renameFolderSchema), async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  const { id } = req.params;
  const { name: newName } = req.body;

  try {
    // Verify the folder being renamed belongs to user's cabin
    const folderToRename = await prisma.galleryFolder.findFirst({
      where: { id, cabinId: req.user!.cabinId },
    });
    if (!folderToRename) {
      return res.status(404).json({ message: "Složka nenalezena." });
    }

    const existing = await prisma.galleryFolder.findFirst({
      where: {
        name: newName.trim(),
        cabinId: req.user!.cabinId,
        NOT: { id },
      },
    });

    if (existing) {
      return res.status(409).json({ message: "Složka s tímto názvem již existuje." });
    }

    const updated = await prisma.galleryFolder.update({
      where: { id },
      data: { name: newName.trim() },
      include: {
        createdBy: {
          select: {
            username: true,
          },
        },
      },
    });

    emitToCabin(req.user!.cabinId!, "gallery:changed", { folderId: updated.id });
    res.json({
      message: "Složka úspěšně přejmenována.",
      folder: {
        id: updated.id,
        name: updated.name,
        createdAt: updated.createdAt.toISOString(),
        createdBy: updated.createdBy?.username,
      },
    });
  } catch (error) {
    logger.error("GALLERY", "Rename folder error", { error: String(error), id });
    res.status(500).json({ message: "Chyba při přejmenování složky." });
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
    const photosInFolder = await prisma.galleryPhoto.findMany({
      where: { folderId: id },
    });

    // Verify folder belongs to user's cabin
    const folder = await prisma.galleryFolder.findFirst({
      where: { id, cabinId: req.user!.cabinId },
    });
    if (!folder) {
      return res.status(404).json({ message: "Složka nenalezena." });
    }

    if (photosInFolder.length > 0 && req.user.role !== "admin" && folder.createdById !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Složku s fotkami může smazat pouze její autor nebo administrátor." });
    }

    // Delete physical files in parallel
    await Promise.all(
      photosInFolder.map(async (photo) => {
        const fileName = photo.src.split("/uploads/")[1];
        if (fileName) {
          const filePath = path.join(uploadsPath, fileName);
          const thumbFile = path.join(thumbsPath, fileName);
          await fs.promises.unlink(filePath).catch(() => {});
          await fs.promises.unlink(thumbFile).catch(() => {});
        }
      })
    );

    // Delete folder (cascade will delete photos)
    await prisma.galleryFolder.delete({
      where: { id },
    });

    emitToCabin(req.user!.cabinId!, "gallery:changed", { folderId: id });
    res.json({ message: "Složka smazána." });
  } catch (error) {
    logger.error("GALLERY", "Delete folder error", { error: String(error), id });
    res.status(500).json({ message: "Chyba při mazání složky." });
  }
});

// ============================================================================
//                           GET PHOTOS
// ============================================================================
router.get("/photos", protect, requireCabin, async (req: Request, res: Response) => {
  try {
    const { folderId, ids } = req.query;

    // Build where clause — always scoped to cabin via folder
    const where: any = {};
    if (folderId) {
      // Verify folder belongs to user's cabin
      const folder = await prisma.galleryFolder.findFirst({
        where: { id: folderId as string, cabinId: req.user!.cabinId },
      });
      if (!folder) {
        return res.status(404).json({ message: "Složka nenalezena." });
      }
      where.folderId = folderId as string;
    } else {
      // If no folderId, scope to folders belonging to this cabin
      where.folder = { cabinId: req.user!.cabinId };
    }
    if (ids) {
      // Support ?ids=id1,id2,id3
      const idList = (ids as string).split(",").filter(Boolean);
      where.id = { in: idList };
    }

    const photos = await prisma.galleryPhoto.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        uploadedBy: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formatted = photos.map((photo) => {
      const fileName = photo.src.split("/uploads/")[1];
      return {
        id: photo.id,
        folderId: photo.folderId,
        src: photo.src,
        thumb: fileName ? `/uploads/thumbs/${fileName}` : photo.src,
        uploadedBy: photo.uploadedBy?.username,
        createdAt: photo.createdAt.toISOString(),
        description: photo.description,
      };
    });

    res.json(formatted);
  } catch (error) {
    logger.error("GALLERY", "Get photos error", { error: String(error) });
    res.status(500).json({ message: "Chyba při načítání fotek." });
  }
});

// ============================================================================
//                          UPLOAD PHOTO(S)
// ============================================================================
router.post("/photos", protect, requireCabin, upload.array("photos", 20), async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  const { folderId } = req.body;

  if (!folderId) {
    return res.status(400).json({ message: "Chybí ID složky." });
  }

  // Verify folder belongs to user's cabin
  const folder = await prisma.galleryFolder.findFirst({
    where: { id: folderId, cabinId: req.user.cabinId },
  });
  if (!folder) {
    return res.status(404).json({ message: "Složka nenalezena." });
  }

  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ message: "Žádné soubory k nahrání." });
  }

  try {
    // Process all images in parallel (sharp + DB insert)
    const results = await Promise.all(
      files.map(async (file) => {
        const fileName = `${uuidv4()}.webp`;
        const filePath = path.join(uploadsPath, fileName);
        const thumbFilePath = path.join(thumbsPath, fileName);

        // Optimize original + generate thumbnail in parallel
        await Promise.all([
          sharp(file.buffer)
            .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
            .webp({ quality: 82 })
            .toFile(filePath),
          sharp(file.buffer)
            .resize(400, 400, { fit: "inside", withoutEnlargement: true })
            .webp({ quality: 70 })
            .toFile(thumbFilePath),
        ]);

        const newPhoto = await prisma.galleryPhoto.create({
          data: {
            folderId,
            src: `/uploads/${fileName}`,
            uploadedById: req.user!.userId,
            description: "",
          },
          include: {
            uploadedBy: {
              select: {
                username: true,
              },
            },
          },
        });

        return {
          id: newPhoto.id,
          folderId: newPhoto.folderId,
          src: newPhoto.src,
          thumb: `/uploads/thumbs/${fileName}`,
          uploadedBy: newPhoto.uploadedBy?.username,
          createdAt: newPhoto.createdAt.toISOString(),
          description: newPhoto.description,
        };
      })
    );

    emitToCabin(req.user!.cabinId!, "gallery:changed", { folderId: results[0]?.folderId });
    res.status(201).json(results);
  } catch (error) {
    logger.error("GALLERY", "Upload photo error", { error: String(error) });
    res.status(500).json({ message: "Chyba při nahrávání fotky." });
  }
});

// ============================================================================
//                        UPDATE PHOTO DESCRIPTION
// ============================================================================
router.patch("/photos/:id", protect, requireCabin, validate(updatePhotoDescriptionSchema), async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  const { id } = req.params;
  const { description } = req.body;

  try {
    // Verify photo's folder belongs to user's cabin
    const existing = await prisma.galleryPhoto.findUnique({
      where: { id },
      include: { folder: { select: { cabinId: true } } },
    });
    if (!existing || existing.folder.cabinId !== req.user!.cabinId) {
      return res.status(404).json({ message: "Fotka nenalezena." });
    }

    const updated = await prisma.galleryPhoto.update({
      where: { id },
      data: { description },
      include: {
        uploadedBy: {
          select: {
            username: true,
          },
        },
      },
    });

    emitToCabin(req.user!.cabinId!, "gallery:changed", { folderId: updated.folderId });
    res.json({
      id: updated.id,
      folderId: updated.folderId,
      src: updated.src,
      uploadedBy: updated.uploadedBy?.username,
      createdAt: updated.createdAt.toISOString(),
      description: updated.description,
    });
  } catch (error) {
    logger.error("GALLERY", "Update photo error", { error: String(error), id });
    res.status(500).json({ message: "Chyba při aktualizaci fotky." });
  }
});

// ============================================================================
//                          DELETE PHOTO
// ============================================================================
router.delete("/photos/:id", protect, requireCabin, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const photo = await prisma.galleryPhoto.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: {
            id: true,
          },
        },
        folder: { select: { cabinId: true } },
      },
    });

    if (!photo || photo.folder.cabinId !== req.user!.cabinId) {
      return res.status(404).json({ message: "Fotka nenalezena." });
    }

    if (photo.uploadedBy?.id !== req.user!.userId && req.user!.role !== "admin") {
      return res.status(403).json({ message: "Nemáte oprávnění smazat tuto fotku." });
    }

    // Delete physical file + thumbnail
    const fileName = photo.src.split("/uploads/")[1];
    if (fileName) {
      const filePath = path.join(uploadsPath, fileName);
      const thumbFile = path.join(thumbsPath, fileName);
      await fs.promises.unlink(filePath).catch(() => {});
      await fs.promises.unlink(thumbFile).catch(() => {});
    }

    await prisma.galleryPhoto.delete({
      where: { id },
    });

    emitToCabin(req.user!.cabinId!, "gallery:changed", { folderId: photo.folderId });
    res.json({ message: "Smazáno." });
  } catch (error) {
    logger.error("GALLERY", "Delete photo error", { error: String(error), id });
    res.status(500).json({ message: "Chyba při mazání." });
  }
});

// ============================================================================
//                      BULK DELETE PHOTOS
// ============================================================================
router.delete("/photos", protect, requireCabin, validate(bulkDeletePhotosSchema), async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  const { photoIds } = req.body;

  try {
    const photos = await prisma.galleryPhoto.findMany({
      where: {
        id: { in: photoIds },
        folder: { cabinId: req.user!.cabinId },
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
          },
        },
      },
    });

    // Filter to only photos user is allowed to delete
    const deletable = photos.filter(
      (photo) => photo.uploadedBy?.id === req.user!.userId || req.user!.role === "admin"
    );

    // Delete physical files in parallel
    await Promise.all(
      deletable.map(async (photo) => {
        const fileName = photo.src.split("/uploads/")[1];
        if (fileName) {
          const fullPath = path.join(uploadsPath, fileName);
          const thumbPath = path.join(thumbsPath, fileName);
          await fs.promises.unlink(fullPath).catch(() => {});
          await fs.promises.unlink(thumbPath).catch(() => {});
        }
      })
    );

    // Bulk delete from DB in one query
    const deletableIds = deletable.map((p) => p.id);
    await prisma.galleryPhoto.deleteMany({
      where: { id: { in: deletableIds } },
    });

    emitToCabin(req.user!.cabinId!, "gallery:changed", { folderId: deletable[0]?.folderId });
    res.json({ message: `Smazáno ${deletable.length} fotek.` });
  } catch (error) {
    logger.error("GALLERY", "Bulk delete photos error", { error: String(error), count: photoIds?.length });
    res.status(500).json({ message: "Chyba při hromadném mazání." });
  }
});

export default router;
