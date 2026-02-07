import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import sharp from "sharp";

const router = Router();
const __dirname = import.meta.dirname;
const uploadsPath = path.join(__dirname, "../../../data/uploads");
const thumbsPath = path.join(__dirname, "../../../data/uploads/thumbs");

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
router.get("/folders", protect, async (req: Request, res: Response) => {
  try {
    const folders = await prisma.galleryFolder.findMany({
      include: {
        createdBy: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formatted = folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      createdAt: folder.createdAt.toISOString(),
      createdBy: folder.createdBy?.username,
    }));

    res.json(formatted);
  } catch (error) {
    logger.error("GALLERY", "Get folders error", { error: String(error) });
    res.status(500).json({ message: "Chyba při načítání složek." });
  }
});

// ============================================================================
//                          CREATE FOLDER
// ============================================================================
router.post("/folders", protect, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  const { name } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ message: "Chybí název složky." });
  }

  try {
    const existing = await prisma.galleryFolder.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return res.status(409).json({ message: "Složka s tímto názvem již existuje." });
    }

    const newFolder = await prisma.galleryFolder.create({
      data: {
        name: name.trim(),
        createdById: req.user.userId,
      },
      include: {
        createdBy: {
          select: {
            username: true,
          },
        },
      },
    });

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
router.patch("/folders/:id", protect, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  const { id } = req.params;
  const { name: newName } = req.body;

  if (!newName || newName.trim().length === 0) {
    return res.status(400).json({ message: "Název složky nesmí být prázdný." });
  }

  try {
    const existing = await prisma.galleryFolder.findFirst({
      where: {
        name: newName.trim(),
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
router.delete("/folders/:id", protect, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  const { id } = req.params;

  try {
    const photosInFolder = await prisma.galleryPhoto.findMany({
      where: { folderId: id },
    });

    if (photosInFolder.length > 0 && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Složka není prázdná. Pouze administrátor ji může smazat." });
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

    res.json({ message: "Složka smazána." });
  } catch (error) {
    logger.error("GALLERY", "Delete folder error", { error: String(error), id });
    res.status(500).json({ message: "Chyba při mazání složky." });
  }
});

// ============================================================================
//                           GET PHOTOS
// ============================================================================
router.get("/photos", protect, async (req: Request, res: Response) => {
  try {
    const { folderId, ids } = req.query;

    // Build where clause
    const where: any = {};
    if (folderId) {
      where.folderId = folderId as string;
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
router.post("/photos", protect, upload.array("photos", 20), async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  const { folderId } = req.body;

  if (!folderId) {
    return res.status(400).json({ message: "Chybí ID složky." });
  }

  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ message: "Žádné soubory k nahrání." });
  }

  try {
    const results = [];

    for (const file of files) {
      const fileName = `${uuidv4()}.webp`;
      const filePath = path.join(uploadsPath, fileName);
      const thumbFilePath = path.join(thumbsPath, fileName);

      // Optimize original — convert to WebP, max 1920px wide
      await sharp(file.buffer)
        .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(filePath);

      // Generate thumbnail — 400px wide
      await sharp(file.buffer)
        .resize(400, 400, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 70 })
        .toFile(thumbFilePath);

      const newPhoto = await prisma.galleryPhoto.create({
        data: {
          folderId,
          src: `/uploads/${fileName}`,
          uploadedById: req.user.userId,
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

      results.push({
        id: newPhoto.id,
        folderId: newPhoto.folderId,
        src: newPhoto.src,
        thumb: `/uploads/thumbs/${fileName}`,
        uploadedBy: newPhoto.uploadedBy?.username,
        createdAt: newPhoto.createdAt.toISOString(),
        description: newPhoto.description,
      });
    }

    res.status(201).json(results.length === 1 ? results[0] : results);
  } catch (error) {
    logger.error("GALLERY", "Upload photo error", { error: String(error) });
    res.status(500).json({ message: "Chyba při nahrávání fotky." });
  }
});

// ============================================================================
//                        UPDATE PHOTO DESCRIPTION
// ============================================================================
router.patch("/photos/:id", protect, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  const { id } = req.params;
  const { description } = req.body;

  try {
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
router.delete("/photos/:id", protect, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

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
      },
    });

    if (!photo) {
      return res.status(404).json({ message: "Fotka nenalezena." });
    }

    if (photo.uploadedBy?.id !== req.user.userId && req.user.role !== "admin") {
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

    res.json({ message: "Smazáno." });
  } catch (error) {
    logger.error("GALLERY", "Delete photo error", { error: String(error), id });
    res.status(500).json({ message: "Chyba při mazání." });
  }
});

// ============================================================================
//                      BULK DELETE PHOTOS
// ============================================================================
router.delete("/photos", protect, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Neautorizováno" });
  }

  const { photoIds } = req.body;

  if (!Array.isArray(photoIds) || photoIds.length === 0) {
    return res.status(400).json({ message: "Žádné fotky k vymazání." });
  }

  try {
    const photos = await prisma.galleryPhoto.findMany({
      where: { id: { in: photoIds } },
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

    res.json({ message: `Smazáno ${deletable.length} fotek.` });
  } catch (error) {
    logger.error("GALLERY", "Bulk delete photos error", { error: String(error), count: photoIds?.length });
    res.status(500).json({ message: "Chyba při hromadném mazání." });
  }
});

export default router;
