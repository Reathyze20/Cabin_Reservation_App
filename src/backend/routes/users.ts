import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import bcrypt from "bcrypt";
import prisma from "../../utils/prisma";
import logger from "../../utils/logger";

const router = Router();

// ============================================================================
//                          GET ALL USERS (safe)
// ============================================================================
router.get("/", protect, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
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
router.patch("/me", protect, async (req: Request, res: Response) => {
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
router.patch("/me/password", protect, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Nejste přihlášen." });

  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: "Chybná nebo krátká hesla." });
  }

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
router.delete("/:id/reservations", protect, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Přístup pouze pro administrátora." });
  }

  const { id } = req.params;

  try {
    await prisma.reservation.deleteMany({
      where: { userId: id },
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
router.put("/:id/role", protect, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Přístup pouze pro administrátora." });
  }

  const { id } = req.params;
  const { role } = req.body;

  try {
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
router.put("/:id/password", protect, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Přístup pouze pro administrátora." });
  }

  const { id } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ message: "Heslo příliš krátké." });
  }

  try {
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
//                            DELETE USER
// ============================================================================
router.delete("/:id", protect, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Přístup pouze pro administrátora." });
  }

  const { id } = req.params;

  try {
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
