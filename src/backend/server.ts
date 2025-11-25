import express, { Request, Response } from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  loadUsers,
  loadReservations,
  saveReservation,
  saveUsers,
  loadShoppingList,
  saveShoppingLists,
  loadNotes,
  saveNotes,
  loadGalleryFolders,
  saveGalleryFolders,
  loadGalleryPhotos,
  saveGalleryPhotos,
  loadDiaryFolders,
  saveDiaryFolders,
  loadDiaryEntries,
  saveDiaryEntries,
} from "../utils/auth";
import fs from "fs";
import { User, Reservation, ShoppingListItem, Note, GalleryFolder, GalleryPhoto, DiaryFolder, DiaryEntry } from "../types";
import { JWT_SECRET } from "../config/config";
import { protect } from "../middleware/authMiddleware";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: "50mb" }));
app.use(cors());

const frontendPath = path.join(__dirname, "../../src/frontend");
const uploadsPath = path.join(__dirname, "../../data/uploads");

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

app.use(express.static(frontendPath));
app.use("/uploads", express.static(uploadsPath));

// ============================================================================
//                                 USERS API
// ============================================================================

app.get("/api/users", protect, async (req: Request, res: Response) => {
  try {
    const users = await loadUsers();
    const safeUsers = users.map(({ id, username, color, role }) => ({ id, username, color, role }));
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ message: "Chyba při načítání uživatelů." });
  }
});

app.delete("/api/users/:id/reservations", protect, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Přístup pouze pro administrátora." });
  const { id } = req.params;
  try {
    let reservations = await loadReservations();
    reservations = reservations.filter((r) => r.userId !== id);
    await saveReservation(reservations);
    res.status(200).json({ message: `Rezervace smazány.` });
  } catch (error) {
    res.status(500).json({ message: "Chyba." });
  }
});

app.put("/api/users/:id/role", protect, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Přístup pouze pro administrátora." });
  const { id } = req.params;
  const { role } = req.body;
  try {
    let users = await loadUsers();
    const user = users.find((u) => u.id === id);
    if (!user) return res.status(404).json({ message: "Uživatel nenalezen." });
    user.role = role;
    await saveUsers(users);
    res.status(200).json({ message: "Role změněna." });
  } catch (error) {
    res.status(500).json({ message: "Chyba." });
  }
});

app.put("/api/users/:id/password", protect, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Přístup pouze pro administrátora." });
  const { id } = req.params;
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ message: "Heslo příliš krátké." });
  try {
    let users = await loadUsers();
    const user = users.find((u) => u.id === id);
    if (!user) return res.status(404).json({ message: "Uživatel nenalezen." });
    user.passwordHash = await bcrypt.hash(password, 10);
    await saveUsers(users);
    res.status(200).json({ message: "Heslo změněno." });
  } catch (error) {
    res.status(500).json({ message: "Chyba." });
  }
});

app.delete("/api/users/:id", protect, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Přístup pouze pro administrátora." });
  const { id } = req.params;
  try {
    let users = await loadUsers();
    users = users.filter((u) => u.id !== id);
    await saveUsers(users);
    res.status(200).json({ message: "Uživatel smazán." });
  } catch (error) {
    res.status(500).json({ message: "Chyba." });
  }
});

// ============================================================================
//                                 AUTH API
// ============================================================================

app.post("/api/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    const users = await loadUsers();
    const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Neplatné přihlašovací údaje." });
    }
    const token = jwt.sign({ userId: user.id, username: user.username, role: user.role || "user" }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, username: user.username, userId: user.id, role: user.role || "user", color: user.color });
  } catch (error) {
    res.status(500).json({ message: "Chyba serveru." });
  }
});

app.post("/api/register", async (req: Request, res: Response) => {
  const { username, password, color } = req.body;
  if (!username || !password || !color) return res.status(400).json({ message: "Chybí údaje." });
  try {
    const users = await loadUsers();
    if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(409).json({ message: "Uživatel existuje." });
    }
    const newUser: User = {
      id: uuidv4(),
      username,
      passwordHash: await bcrypt.hash(password, 10),
      color,
      role: users.length === 0 ? "admin" : "user",
    };
    users.push(newUser);
    await saveUsers(users);
    res.status(201).json({ message: "Registrace úspěšná." });
  } catch (error) {
    res.status(500).json({ message: "Chyba serveru." });
  }
});

// ============================================================================
//                             RESERVATIONS API
// ============================================================================

app.get("/api/reservations", protect, async (req, res) => {
  try {
    const reservations = await loadReservations();
    const users = await loadUsers();
    const userColorMap = new Map(users.map((u) => [u.id, u.color]));
    const result = reservations.map((r) => ({ ...r, userColor: userColorMap.get(r.userId) || "#808080" }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Chyba." });
  }
});

app.post("/api/reservations", protect, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno." });
  const { from, to, purpose, notes } = req.body;
  if (!from || !to) return res.status(400).json({ message: "Chybí data." });

  try {
    const allReservations = await loadReservations();

    const newStart = new Date(from);
    const newEnd = new Date(to);

    const collision = allReservations.some((r) => {
      const rStart = new Date(r.from);
      const rEnd = new Date(r.to);
      return newStart <= rEnd && newEnd >= rStart && r.status !== "backup";
    });

    const status = collision ? "backup" : "primary";

    const newReservation: Reservation = {
      id: uuidv4(),
      userId: req.user.userId,
      username: req.user.username,
      from,
      to,
      purpose,
      notes,
      status,
    };
    allReservations.push(newReservation);
    await saveReservation(allReservations);
    res.status(201).json(newReservation);
  } catch (error) {
    res.status(500).json({ message: "Chyba." });
  }
});

app.put("/api/reservations/:id", protect, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno." });
  const { id } = req.params;
  const { purpose, notes, from, to } = req.body;
  try {
    const allReservations = await loadReservations();
    const resIdx = allReservations.findIndex((r) => r.id === id);
    if (resIdx === -1) return res.status(404).json({ message: "Nenalezeno." });
    if (allReservations[resIdx].userId !== req.user.userId && req.user.role !== "admin") return res.status(403).json({ message: "Bez oprávnění." });

    if (from) allReservations[resIdx].from = from;
    if (to) allReservations[resIdx].to = to;
    if (purpose) allReservations[resIdx].purpose = purpose;
    if (notes) allReservations[resIdx].notes = notes;

    await saveReservation(allReservations);
    res.json(allReservations[resIdx]);
  } catch (error) {
    res.status(500).json({ message: "Chyba." });
  }
});

app.post("/api/reservations/delete", protect, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno." });
  const { id } = req.body;
  try {
    let allReservations = await loadReservations();
    const r = allReservations.find((r) => r.id === id);
    if (!r) return res.status(404).json({ message: "Nenalezeno." });
    if (r.userId !== req.user.userId && req.user.role !== "admin") return res.status(403).json({ message: "Bez oprávnění." });

    allReservations = allReservations.filter((res) => res.id !== id);
    await saveReservation(allReservations);
    res.json({ message: "Smazáno." });
  } catch (error) {
    res.status(500).json({ message: "Chyba." });
  }
});

app.post("/api/reservations/:reservationId/assign", protect, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Pouze admin." });
  const { reservationId } = req.params;
  const { newOwnerId } = req.body;

  try {
    const allReservations = await loadReservations();
    const resIdx = allReservations.findIndex((r) => r.id === reservationId);
    if (resIdx === -1) return res.status(404).json({ message: "Nenalezeno." });

    const users = await loadUsers();
    const newOwner = users.find((u) => u.id === newOwnerId);
    if (!newOwner) return res.status(404).json({ message: "Nový vlastník nenalezen." });

    allReservations[resIdx].userId = newOwner.id;
    allReservations[resIdx].username = newOwner.username;

    await saveReservation(allReservations);
    res.json({ message: "Přiřazeno." });
  } catch (error) {
    res.status(500).json({ message: "Chyba." });
  }
});

// ============================================================================
//                             SHOPPING LIST API
// ============================================================================

app.get("/api/shopping-list", protect, async (req, res) => {
  try {
    const raw = await loadShoppingList();
    res.json([{ id: "default", name: "Hlavní seznam", items: raw }]);
  } catch (error) {
    res.status(500).json({ message: "Chyba" });
  }
});

app.post("/api/shopping-list", protect, async (req, res) => {
  res.status(200).json({ id: "default", name: "Hlavní seznam", items: [] });
});

app.post("/api/shopping-list/:listId/items", protect, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Chyba" });
  try {
    let items = await loadShoppingList();
    const newItem: ShoppingListItem = {
      id: uuidv4(),
      name,
      addedBy: req.user?.username || "?",
      addedById: req.user?.userId || "?",
      createdAt: new Date().toISOString(),
      purchased: false,
    };
    items.push(newItem);
    await saveShoppingLists(items);
    res.status(201).json(newItem);
  } catch (e) {
    res.status(500).json({ message: "Chyba" });
  }
});

app.put("/api/shopping-list/:listId/items/:itemId/purchase", protect, async (req, res) => {
  const { itemId } = req.params;
  const { purchased } = req.body;
  try {
    let items = await loadShoppingList();
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx > -1) {
      items[idx].purchased = purchased;
      if (purchased) {
        items[idx].purchasedBy = req.user?.username;
        items[idx].purchasedById = req.user?.userId;
        items[idx].purchasedAt = new Date().toISOString();
      } else {
        items[idx].purchasedBy = undefined;
        items[idx].purchasedById = undefined;
        items[idx].purchasedAt = undefined;
        items[idx].price = undefined;
        items[idx].splitWith = undefined;
      }
      await saveShoppingLists(items);
      res.json(items[idx]);
    } else {
      res.status(404).json({ message: "Nenalezeno" });
    }
  } catch (e) {
    res.status(500).json({ message: "Chyba" });
  }
});

app.put("/api/shopping-list/:itemId/purchase", protect, async (req, res) => {
  const { itemId } = req.params;
  const { purchased, price, splitWith } = req.body;
  try {
    let items = await loadShoppingList();
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx > -1) {
      items[idx].purchased = purchased;
      if (purchased) {
        items[idx].purchasedBy = req.user?.username;
        items[idx].purchasedById = req.user?.userId;
        items[idx].purchasedAt = new Date().toISOString();
        if (price) items[idx].price = price;
        if (splitWith) items[idx].splitWith = splitWith;
      } else {
        items[idx].purchasedBy = undefined;
        items[idx].purchasedById = undefined;
        items[idx].purchasedAt = undefined;
        items[idx].price = undefined;
        items[idx].splitWith = undefined;
      }
      await saveShoppingLists(items);
      res.json(items[idx]);
    } else {
      res.status(404).json({ message: "Nenalezeno" });
    }
  } catch (e) {
    res.status(500).json({ message: "Chyba" });
  }
});

app.delete("/api/shopping-list/:listId/items/:itemId", protect, async (req, res) => {
  const { itemId } = req.params;
  try {
    let items = await loadShoppingList();
    items = items.filter((i) => i.id !== itemId);
    await saveShoppingLists(items);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: "Chyba" });
  }
});

app.delete("/api/shopping-list/:itemId", protect, async (req, res) => {
  const { itemId } = req.params;
  try {
    let items = await loadShoppingList();
    items = items.filter((i) => i.id !== itemId);
    await saveShoppingLists(items);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: "Chyba" });
  }
});

// ============================================================================
//                                NOTES API
// ============================================================================

app.get("/api/notes", protect, async (req, res) => {
  try {
    const notes = await loadNotes();
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: "Chyba" });
  }
});
app.post("/api/notes", protect, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno" });
  const { message } = req.body;
  try {
    const notes = await loadNotes();
    const newNote: Note = {
      id: uuidv4(),
      userId: req.user.userId,
      username: req.user.username,
      message,
      createdAt: new Date().toISOString(),
    };
    notes.push(newNote);
    await saveNotes(notes);
    res.status(201).json(newNote);
  } catch (error) {
    res.status(500).json({ message: "Chyba" });
  }
});
app.delete("/api/notes/:id", protect, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno" });
  const { id } = req.params;
  try {
    let notes = await loadNotes();
    const noteToDelete = notes.find((n) => n.id === id);
    if (!noteToDelete) return res.status(404).json({ message: "Nenalezeno" });

    if (req.user.role !== "admin" && noteToDelete.userId !== req.user.userId) {
      return res.status(403).json({ message: "Nemáte oprávnění." });
    }

    notes = notes.filter((n) => n.id !== id);
    await saveNotes(notes);
    res.json({ message: "Smazáno" });
  } catch (error) {
    res.status(500).json({ message: "Chyba" });
  }
});

// ============================================================================
//                             GALLERY API
// ============================================================================
app.get("/api/gallery/folders", protect, async (req, res) => {
  try {
    const folders = await loadGalleryFolders();
    res.json(folders);
  } catch (error) {
    res.status(500).json({ message: "Chyba při načítání složek." });
  }
});

app.post("/api/gallery/folders", protect, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno" });
  const { name } = req.body;
  if (!name || name.trim().length === 0) return res.status(400).json({ message: "Chybí název složky." });

  try {
    const folders = await loadGalleryFolders();
    if (folders.some((f) => f.name.toLowerCase() === name.trim().toLowerCase())) {
      return res.status(409).json({ message: "Složka s tímto názvem již existuje." });
    }
    const newFolder: GalleryFolder = {
      id: uuidv4(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      createdBy: req.user.username,
    };
    folders.push(newFolder);
    await saveGalleryFolders(folders);
    res.status(201).json(newFolder);
  } catch (error) {
    res.status(500).json({ message: "Chyba při vytváření složky." });
  }
});

app.patch("/api/gallery/folders/:id", protect, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno" });
  const { id } = req.params;
  const { name: newName } = req.body;
  if (!newName || newName.trim().length === 0) {
    return res.status(400).json({ message: "Název složky nesmí být prázdný." });
  }
  try {
    let folders = await loadGalleryFolders();
    const folderIndex = folders.findIndex((f) => f.id === id);
    if (folderIndex === -1) return res.status(404).json({ message: "Složka nenalezena." });
    const trimmedNewName = newName.trim();
    if (folders.some((f, idx) => idx !== folderIndex && f.name.toLowerCase() === trimmedNewName.toLowerCase())) {
      return res.status(409).json({ message: "Složka s tímto názvem již existuje." });
    }
    folders[folderIndex].name = trimmedNewName;
    await saveGalleryFolders(folders);
    res.json({ message: "Složka úspěšně přejmenována.", folder: folders[folderIndex] });
  } catch (error) {
    res.status(500).json({ message: "Chyba při přejmenování složky." });
  }
});

app.delete("/api/gallery/folders/:id", protect, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno" });
  const { id } = req.params;
  try {
    let folders = await loadGalleryFolders();
    const folderIdx = folders.findIndex((f) => f.id === id);
    if (folderIdx === -1) return res.status(404).json({ message: "Složka nenalezena." });

    let photos = await loadGalleryPhotos();
    const photosInFolder = photos.filter((p) => p.folderId === id);

    if (photosInFolder.length > 0) {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Složka není prázdná. Pouze administrátor ji může smazat." });
      }
      for (const photo of photosInFolder) {
        const fileName = photo.src.split("/uploads/")[1];
        if (fileName) {
          const filePath = path.join(uploadsPath, fileName);
          if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
          }
        }
      }
      photos = photos.filter((p) => p.folderId !== id);
      await saveGalleryPhotos(photos);
    }
    folders.splice(folderIdx, 1);
    await saveGalleryFolders(folders);
    res.json({ message: "Složka smazána." });
  } catch (error) {
    res.status(500).json({ message: "Chyba při mazání složky." });
  }
});

app.get("/api/gallery/photos", protect, async (req, res) => {
  try {
    const photos = await loadGalleryPhotos();
    const folderId = req.query.folderId;
    if (folderId) {
      const filtered = photos.filter((p: any) => p.folderId === folderId);
      return res.json(filtered);
    }
    res.json(photos);
  } catch (error) {
    res.status(500).json({ message: "Chyba při načítání fotek." });
  }
});

app.post("/api/gallery/photos", protect, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno" });
  const { folderId, imageBase64 } = req.body;

  if (!folderId || !imageBase64) return res.status(400).json({ message: "Chybí data." });

  try {
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ message: "Neplatný formát obrázku." });
    }

    const imageBuffer = Buffer.from(matches[2], "base64");
    const type = matches[1];
    const extension = type.split("/")[1] || "jpg";
    const fileName = `${uuidv4()}.${extension}`;
    const filePath = path.join(uploadsPath, fileName);

    await fs.promises.writeFile(filePath, imageBuffer);

    const photos = await loadGalleryPhotos();
    const newPhoto: GalleryPhoto = {
      id: uuidv4(),
      folderId,
      src: `/uploads/${fileName}`,
      uploadedBy: req.user.username,
      createdAt: new Date().toISOString(),
      description: "",
    } as GalleryPhoto;

    photos.push(newPhoto);
    await saveGalleryPhotos(photos);

    res.status(201).json(newPhoto);
  } catch (error) {
    res.status(500).json({ message: "Chyba při nahrávání fotky." });
  }
});

app.patch("/api/gallery/photos/:id", protect, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno" });
  const { id } = req.params;
  const { description } = req.body;

  try {
    const photos = await loadGalleryPhotos();
    const photoIndex = photos.findIndex((p) => p.id === id);
    if (photoIndex === -1) return res.status(404).json({ message: "Fotka nenalezena." });
    if (description !== undefined) {
      (photos[photoIndex] as any).description = description;
    }
    await saveGalleryPhotos(photos);
    res.json(photos[photoIndex]);
  } catch (error) {
    res.status(500).json({ message: "Chyba při aktualizaci fotky." });
  }
});

app.delete("/api/gallery/photos/:id", protect, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno" });
  const { id } = req.params;
  try {
    let photos = await loadGalleryPhotos();
    const photoIndex = photos.findIndex((p) => p.id === id);
    if (photoIndex === -1) return res.status(404).json({ message: "Fotka nenalezena." });
    const photo = photos[photoIndex];
    if (photo.uploadedBy !== req.user.username && req.user.role !== "admin") {
      return res.status(403).json({ message: "Nemáte oprávnění smazat tuto fotku." });
    }
    const fileName = photo.src.split("/uploads/")[1];
    if (fileName) {
      const filePath = path.join(uploadsPath, fileName);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    }
    photos.splice(photoIndex, 1);
    await saveGalleryPhotos(photos);
    res.json({ message: "Smazáno." });
  } catch (error) {
    res.status(500).json({ message: "Chyba při mazání." });
  }
});

app.delete("/api/gallery/photos", protect, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno" });
  const { photoIds } = req.body;
  if (!Array.isArray(photoIds) || photoIds.length === 0) {
    return res.status(400).json({ message: "Žádné fotky k vymazání." });
  }
  try {
    let photos = await loadGalleryPhotos();
    const initialCount = photos.length;
    const photosToDelete = photos.filter((p) => photoIds.includes(p.id));
    for (const photo of photosToDelete) {
      if (photo.uploadedBy !== req.user.username && req.user.role !== "admin") continue;
      const fileName = photo.src.split("/uploads/")[1];
      if (fileName) {
        const filePath = path.join(uploadsPath, fileName);
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      }
      photos = photos.filter((p) => p.id !== photo.id);
    }
    await saveGalleryPhotos(photos);
    const deletedCount = initialCount - photos.length;
    res.json({ message: `Smazáno ${deletedCount} fotek.` });
  } catch (error) {
    res.status(500).json({ message: "Chyba při hromadném mazání." });
  }
});

// ============================================================================
//                                DIARY API
// ============================================================================

app.get("/api/diary/folders", protect, async (req, res) => {
  try {
    const folders = await loadDiaryFolders();
    res.json(folders);
  } catch (error) {
    res.status(500).json({ message: "Chyba při načítání deníku." });
  }
});

app.post("/api/diary/folders", protect, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno" });
  const { name, startDate, endDate } = req.body;
  if (!name || !startDate || !endDate) return res.status(400).json({ message: "Chybí název nebo datumy." });

  try {
    const folders = await loadDiaryFolders();
    const newFolder: DiaryFolder = {
      id: uuidv4(),
      name,
      createdAt: new Date().toISOString(),
      createdBy: req.user.username,
      startDate,
      endDate,
    };
    folders.push(newFolder);
    await saveDiaryFolders(folders);
    res.status(201).json(newFolder);
  } catch (error) {
    res.status(500).json({ message: "Chyba při vytváření složky." });
  }
});

// NOVÉ: Přejmenování složky deníku
app.patch("/api/diary/folders/:id", protect, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno" });
  const { id } = req.params;
  const { name: newName } = req.body;
  if (!newName || newName.trim().length === 0) {
    return res.status(400).json({ message: "Název složky nesmí být prázdný." });
  }
  try {
    let folders = await loadDiaryFolders();
    const folderIndex = folders.findIndex((f) => f.id === id);
    if (folderIndex === -1) return res.status(404).json({ message: "Deník nenalezen." });

    if (req.user.role !== "admin" && folders[folderIndex].createdBy !== req.user.username) {
      return res.status(403).json({ message: "Nemáte oprávnění přejmenovat tento deník." });
    }

    folders[folderIndex].name = newName.trim();
    await saveDiaryFolders(folders);
    res.json({ message: "Deník úspěšně přejmenován.", folder: folders[folderIndex] });
  } catch (error) {
    res.status(500).json({ message: "Chyba při přejmenování deníku." });
  }
});

app.delete("/api/diary/folders/:id", protect, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno" });
  const { id } = req.params;

  try {
    let folders = await loadDiaryFolders();
    const folderIdx = folders.findIndex((f) => f.id === id);
    if (folderIdx === -1) return res.status(404).json({ message: "Složka nenalezena." });

    // Ověření oprávnění (jen admin nebo autor)
    if (req.user.role !== "admin" && folders[folderIdx].createdBy !== req.user.username) {
      return res.status(403).json({ message: "Nemáte oprávnění smazat toto období." });
    }

    // Smazat složku
    folders.splice(folderIdx, 1);
    await saveDiaryFolders(folders);

    // Smazat i všechny záznamy v této složce
    let entries = await loadDiaryEntries();
    const initialEntryCount = entries.length;
    entries = entries.filter((e) => e.folderId !== id);
    if (entries.length !== initialEntryCount) {
      await saveDiaryEntries(entries);
    }

    res.json({ message: "Složka a záznamy smazány." });
  } catch (error) {
    console.error("Delete diary folder error:", error);
    res.status(500).json({ message: "Chyba při mazání složky." });
  }
});

app.get("/api/diary/entries", protect, async (req, res) => {
  const folderId = req.query.folderId as string;
  try {
    const entries = await loadDiaryEntries();
    if (folderId) {
      const filtered = entries.filter((e) => e.folderId === folderId);
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return res.json(filtered);
    }
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: "Chyba." });
  }
});

app.post("/api/diary/entries", protect, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno" });
  const { folderId, date, content, galleryPhotoIds } = req.body; // Přidáno galleryPhotoIds

  if (!folderId || !date || !content) return res.status(400).json({ message: "Chybí data." });

  try {
    const entries = await loadDiaryEntries();
    const newEntry: DiaryEntry = {
      id: uuidv4(),
      folderId,
      date,
      content,
      author: req.user.username,
      authorId: req.user.userId,
      createdAt: new Date().toISOString(),
      galleryPhotoIds: galleryPhotoIds || [], // Ukládáme ID fotek
    };
    entries.push(newEntry);
    await saveDiaryEntries(entries);
    res.status(201).json(newEntry);
  } catch (error) {
    res.status(500).json({ message: "Chyba při ukládání záznamu." });
  }
});

app.delete("/api/diary/entries/:id", protect, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Neautorizováno" });
  const { id } = req.params;

  try {
    let entries = await loadDiaryEntries();
    const entryIdx = entries.findIndex((e) => e.id === id);
    if (entryIdx === -1) return res.status(404).json({ message: "Záznam nenalezen." });

    if (req.user.role !== "admin" && entries[entryIdx].authorId !== req.user.userId) {
      return res.status(403).json({ message: "Nemáte oprávnění smazat tento záznam." });
    }

    entries.splice(entryIdx, 1);
    await saveDiaryEntries(entries);
    res.json({ message: "Záznam smazán." });
  } catch (error) {
    res.status(500).json({ message: "Chyba při mazání záznamu." });
  }
});

// --- FALLBACK PRO SPA ---
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../src/frontend/index.html"));
});

app.listen(port, () => {
  console.log(`Backend server naslouchá na http://localhost:${port}`);
});
