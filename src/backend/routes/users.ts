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

export default router;
