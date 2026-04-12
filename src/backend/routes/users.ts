import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import { requireCabin } from "../../middleware/cabinMiddleware";
import { validate } from "../../validators/validate";
import { createUserSchema, updateProfileSchema, changeMyPasswordSchema, changeRoleSchema, changePasswordSchema, adminUpdateUserSchema } from "../../validators/schemas";
import bcrypt from "bcrypt";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";

const router = Router();

// ============================================================================
//                          GET ALL USERS (safe)
// ============================================================================
router.get("/", protect, requireCabin, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { cabinId: req.user!.cabinId },
      select: {
        id: true,
        username: true,
        color: true,
        role: true,
        animalIcon: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            reservations: true,
            galleryPhotos: true,
            noteThreads: true,
          },
        },
      },
    });
    res.json(users);
  } catch (error) {
    logger.error("USERS", "Get users error", { error: String(error) });
    res.status(500).json({ message: "Chyba při načítání uživatelů." });
  }
});

// ============================================================================
//                          CREATE USER (ADMIN)
// ============================================================================
router.post("/", protect, requireCabin, validate(createUserSchema), async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Přístup pouze pro administrátora." });
  }

  const { username, password, role } = req.body;

  try {
    const existingUser = await prisma.user.findFirst({ where: { username, cabinId: req.user.cabinId } });
    if (existingUser) {
      return res.status(400).json({ message: "Uživatel již existuje." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const randomColor = "#" + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    const newUser = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role: role || "member",
        color: randomColor,
        cabinId: req.user!.cabinId,
      },
    });

    res.status(201).json({ message: "Uživatel vytvořen.", user: { id: newUser.id, username: newUser.username } });
  } catch (error) {
    logger.error("USERS", "Create user error", { error: String(error) });
    res.status(500).json({ message: "Chyba." });
  }
});

// ============================================================================
//                                GET MY PROFILE
// ============================================================================
router.get("/me", protect, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Nejste přihlášen." });

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        username: true,
        email: true,
        color: true,
        animalIcon: true,
        role: true,
        isEmailVerified: true
      }
    });
    if (!user) return res.status(404).json({ message: "Uživatel nenalezen" });
    res.json(user);
  } catch (error) {
    logger.error("USERS", "Get me error", { error: String(error) });
    res.status(500).json({ message: "Chyba." });
  }
});

// ============================================================================
//                                UPDATE MY PROFILE
// ============================================================================
router.patch("/me", protect, validate(updateProfileSchema), async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Nejste přihlášen." });

  const { email, color, animalIcon } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        email: email !== undefined ? email : undefined,
        color: color !== undefined ? color : undefined,
        animalIcon: animalIcon !== undefined ? animalIcon : undefined
      },
      select: { email: true, color: true, animalIcon: true }
    });
    res.json({ message: "Profil aktualizován.", user: updatedUser });
  } catch (error) {
    logger.error("USERS", "Update me error", { error: String(error) });
    res.status(500).json({ message: "Chyba při updatu profilu." });
  }
});

// ============================================================================
//                            CHANGE MY PASSWORD
// ============================================================================
router.patch("/me/password", protect, validate(changeMyPasswordSchema), async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Nejste přihlášen." });

  const { oldPassword, newPassword } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user || !(await bcrypt.compare(oldPassword, user.passwordHash))) {
      return res.status(400).json({ message: "Nesprávné původní heslo." });
    }

    await prisma.user.update({
      where: { id: req.user.userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) }
    });

    res.json({ message: "Heslo úspěšně změněno." });
  } catch (error) {
    logger.error("USERS", "Change my password error", { error: String(error) });
    res.status(500).json({ message: "Chyba." });
  }
});

// ============================================================================
//                    DELETE USER'S RESERVATIONS
// ============================================================================
router.delete("/:id/reservations", protect, requireCabin, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Přístup pouze pro administrátora." });
  }

  const { id } = req.params;

  try {
    await prisma.reservation.deleteMany({
      where: { userId: id, cabinId: req.user.cabinId },
    });
    res.status(200).json({ message: "Rezervace smazány." });
  } catch (error) {
    logger.error("USERS", "Delete reservations error", { error: String(error), userId: id });
    res.status(500).json({ message: "Chyba." });
  }
});

// ============================================================================
//                          CHANGE USER ROLE
// ============================================================================
router.put("/:id/role", protect, requireCabin, validate(changeRoleSchema), async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Přístup pouze pro administrátora." });
  }

  const { id } = req.params;
  const { role } = req.body;

  try {
    // Verify target user belongs to same cabin
    const targetUser = await prisma.user.findFirst({ where: { id, cabinId: req.user.cabinId } });
    if (!targetUser) {
      return res.status(404).json({ message: "Uživatel nenalezen." });
    }

    await prisma.user.update({
      where: { id },
      data: { role },
    });
    res.status(200).json({ message: "Role změněna." });
  } catch (error) {
    logger.error("USERS", "Change role error", { error: String(error), userId: id });
    res.status(500).json({ message: "Chyba." });
  }
});

// ============================================================================
//                        CHANGE USER PASSWORD
// ============================================================================
router.put("/:id/password", protect, requireCabin, validate(changePasswordSchema), async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Přístup pouze pro administrátora." });
  }

  const { id } = req.params;
  const { password } = req.body;

  try {
    // Verify target user belongs to same cabin
    const targetUser = await prisma.user.findFirst({ where: { id, cabinId: req.user.cabinId } });
    if (!targetUser) {
      return res.status(404).json({ message: "Uživatel nenalezen." });
    }

    await prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(password, 10) },
    });
    res.status(200).json({ message: "Heslo změněno." });
  } catch (error) {
    logger.error("USERS", "Change password error", { error: String(error), userId: id });
    res.status(500).json({ message: "Chyba." });
  }
});

// ============================================================================
//                          UPDATE USER (ADMIN)
// ============================================================================
router.patch("/:id", protect, requireCabin, validate(adminUpdateUserSchema), async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Přístup pouze pro administrátora." });
  }

  const { id } = req.params;
  const { role, password } = req.body;

  try {
    // Verify target user belongs to same cabin
    const targetUser = await prisma.user.findFirst({ where: { id, cabinId: req.user.cabinId } });
    if (!targetUser) {
      return res.status(404).json({ message: "Uživatel nenalezen." });
    }

    const data: any = {};
    if (role) data.role = role;
    if (password && password.length >= 6) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    await prisma.user.update({
      where: { id },
      data,
    });
    res.status(200).json({ message: "Uživatel upraven." });
  } catch (error) {
    logger.error("USERS", "Update user error", { error: String(error), userId: id });
    res.status(500).json({ message: "Chyba." });
  }
});

// ============================================================================
//                            DELETE USER
// ============================================================================
router.delete("/:id", protect, requireCabin, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Přístup pouze pro administrátora." });
  }

  const { id } = req.params;

  try {
    // Verify target user belongs to same cabin
    const targetUser = await prisma.user.findFirst({ where: { id, cabinId: req.user.cabinId } });
    if (!targetUser) {
      return res.status(404).json({ message: "Uživatel nenalezen." });
    }

    await prisma.user.delete({
      where: { id },
    });
    res.status(200).json({ message: "Uživatel smazán." });
  } catch (error) {
    logger.error("USERS", "Delete user error", { error: String(error), userId: id });
    res.status(500).json({ message: "Chyba." });
  }
});

// ============================================================================
//                   SOFT REMOVE USER FROM CABIN (ADMIN)
// ============================================================================
router.patch("/:id/remove-from-cabin", protect, requireCabin, async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Přístup pouze pro administrátora." });
    }

    const { id } = req.params;
    const { deleteData } = req.body;

    // Cannot remove yourself
    if (id === req.user.userId) {
      return res.status(400).json({ message: "Nemůžete odebrat sami sebe." });
    }

    // Verify target user belongs to same cabin
    const targetUser = await prisma.user.findFirst({
      where: { id, cabinId: req.user.cabinId },
    });
    if (!targetUser) {
      return res.status(404).json({ message: "Uživatel nenalezen." });
    }

    if (deleteData) {
      // Hard remove — delete user entirely (cascade)
      await prisma.user.delete({ where: { id } });
      logger.info("USERS", "User hard-removed from cabin (data deleted)", {
        userId: id,
        username: targetUser.username,
        cabinId: req.user.cabinId,
        removedBy: req.user.userId,
      });
      res.json({ message: "Uživatel a jeho data byly smazány." });
    } else {
      // Soft remove — keep user but unlink from cabin
      await prisma.user.update({
        where: { id },
        data: { cabinId: null, role: "user" },
      });
      logger.info("USERS", "User soft-removed from cabin (data preserved)", {
        userId: id,
        username: targetUser.username,
        cabinId: req.user.cabinId,
        removedBy: req.user.userId,
      });
      res.json({ message: "Uživatel byl odebrán z chaty. Jeho data zůstala zachována." });
    }
  } catch (error) {
    logger.error("USERS", "Remove from cabin error", { error: String(error) });
    res.status(500).json({ message: "Chyba při odebírání uživatele." });
  }
});

// ============================================================================
//                   EXPORT MY DATA (GDPR Art. 20)
// ============================================================================
router.get("/me/export", protect, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Neautorizováno" });

    const userId = req.user.userId;

    // Parallel fetch of all user data
    const [
      profile,
      reservations,
      noteThreads,
      notes,
      diaryEntries,
      galleryPhotos,
      shoppingItems,
      reconstructionItems,
      availabilities,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          color: true,
          animalIcon: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.reservation.findMany({
        where: { userId },
        select: {
          id: true,
          dateFrom: true,
          dateTo: true,
          purpose: true,
          notes: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.noteThread.findMany({
        where: { createdById: userId },
        select: { id: true, title: true, createdAt: true },
      }),
      prisma.note.findMany({
        where: { userId },
        select: { id: true, content: true, createdAt: true },
      }),
      prisma.diaryEntry.findMany({
        where: { authorId: userId },
        select: { id: true, title: true, content: true, date: true, createdAt: true },
      }),
      prisma.galleryPhoto.findMany({
        where: { uploadedById: userId },
        select: { id: true, filename: true, description: true, createdAt: true },
      }),
      prisma.shoppingListItem.findMany({
        where: { addedById: userId },
        select: { id: true, name: true, quantity: true, unit: true, createdAt: true },
      }),
      prisma.reconstructionItem.findMany({
        where: { createdById: userId },
        select: { id: true, title: true, description: true, status: true, createdAt: true },
      }),
      prisma.userAvailability.findMany({
        where: { userId },
        select: { id: true, dateFrom: true, dateTo: true, status: true },
      }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile,
      reservations,
      noteThreads,
      notes,
      diaryEntries,
      galleryPhotos: galleryPhotos.map(p => ({ ...p, note: "Soubory fotografií nejsou součástí exportu." })),
      shoppingItems,
      reconstructionItems,
      availabilities,
    };

    res.setHeader("Content-Disposition", "attachment; filename=moje-data.json");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.json(exportData);
  } catch (error) {
    logger.error("USERS", "Export my data error", { error: String(error) });
    res.status(500).json({ message: "Chyba při exportu dat." });
  }
});

// ============================================================================
//               DELETE MY ACCOUNT (GDPR Art. 17 — Self-service)
// ============================================================================
router.delete("/me", protect, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Neautorizováno" });

    const { password } = req.body;
    if (!password || typeof password !== "string") {
      return res.status(400).json({ message: "Pro smazání účtu zadejte heslo." });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ message: "Uživatel nenalezen." });

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ message: "Nesprávné heslo." });
    }

    // If admin, check if they're the only one
    if (user.cabinId && req.user.role === "admin") {
      const adminCount = await prisma.user.count({
        where: { cabinId: user.cabinId, role: "admin" },
      });
      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Jste jediný admin chaty. Nejdříve předejte roli admina jinému členovi.",
        });
      }
    }

    // Delete user — Prisma cascade handles related records
    await prisma.user.delete({ where: { id: req.user.userId } });

    logger.info("USERS", "User self-deleted account (GDPR)", {
      userId: req.user.userId,
      username: req.user.username,
    });

    res.json({ message: "Váš účet byl nenávratně smazán." });
  } catch (error) {
    logger.error("USERS", "Self-delete account error", { error: String(error) });
    res.status(500).json({ message: "Chyba při mazání účtu." });
  }
});

// ============================================================================
//                     LEAVE CABIN (SELF-SERVICE)
// ============================================================================
router.post("/me/leave-cabin", protect, requireCabin, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Neautorizováno" });

    // Check if user is the only admin — cannot leave
    if (req.user.role === "admin") {
      const adminCount = await prisma.user.count({
        where: { cabinId: req.user.cabinId, role: "admin" },
      });
      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Jste jediný admin. Nejdříve předejte roli admina jinému členovi.",
        });
      }
    }

    // Soft leave — keep user, unlink from cabin
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { cabinId: null, role: "user" },
    });

    logger.info("USERS", "User left cabin voluntarily", {
      userId: req.user.userId,
      username: req.user.username,
      cabinId: req.user.cabinId,
    });

    res.json({ message: "Úspěšně jste opustili chatu." });
  } catch (error) {
    logger.error("USERS", "Leave cabin error", { error: String(error) });
    res.status(500).json({ message: "Chyba při opouštění chaty." });
  }
});

export default router;
