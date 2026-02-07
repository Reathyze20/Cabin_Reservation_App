import { Router, Request, Response } from "express";
import { protect } from "../../middleware/authMiddleware";
import bcrypt from "bcrypt";
import prisma from "../../utils/prisma";

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
      },
    });
    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Chyba při načítání uživatelů." });
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
    console.error("Delete reservations error:", error);
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
    console.error("Change role error:", error);
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
    console.error("Change password error:", error);
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
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Chyba." });
  }
});

export default router;
