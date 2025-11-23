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
  saveGalleryPhotos
} from "../utils/auth";
import fs from 'fs';
import { User, Reservation, ShoppingListItem, Note, GalleryFolder, GalleryPhoto } from "../types";
import { JWT_SECRET } from "../config/config";
import { protect } from "../middleware/authMiddleware";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const app = express();
const port = process.env.PORT || 3000;

// Zvýšení limitu pro JSON body, aby šly nahrávat obrázky (Base64 je velký)
app.use(express.json({ limit: '50mb' }));
app.use(cors());

const frontendPath = path.join(__dirname, "../../src/frontend");
const uploadsPath = path.join(__dirname, "../../data/uploads");

// Zajistíme, že složka pro uploady existuje
if (!fs.existsSync(uploadsPath)){
    fs.mkdirSync(uploadsPath, { recursive: true });
}

app.use(express.static(frontendPath));
// Zpřístupnění nahraných obrázků na URL /uploads/...
app.use('/uploads', express.static(uploadsPath));


// --- USERS Endpoints ---
app.get('/api/users', protect, async (req: Request, res: Response) => {
  try {
    const users = await loadUsers();
    const safeUsers = users.map(({ id, username, color, role }) => ({ id, username, color, role }));
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ message: 'Chyba při načítání uživatelů.' });
  }
});

app.delete('/api/users/:id/reservations', protect, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Přístup pouze pro administrátora.' });
  const { id } = req.params;
  try {
    let reservations = await loadReservations();
    reservations = reservations.filter(r => r.userId !== id);
    await saveReservation(reservations);
    res.status(200).json({ message: `Rezervace smazány.` });
  } catch (error) {
    res.status(500).json({ message: 'Chyba.' });
  }
});

app.put('/api/users/:id/role', protect, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Přístup pouze pro administrátora.' });
  const { id } = req.params;
  const { role } = req.body;
  try {
    let users = await loadUsers();
    const user = users.find(u => u.id === id);
    if (!user) return res.status(404).json({ message: 'Uživatel nenalezen.' });
    user.role = role;
    await saveUsers(users);
    res.status(200).json({ message: 'Role změněna.' });
  } catch (error) {
    res.status(500).json({ message: 'Chyba.' });
  }
});

app.put('/api/users/:id/password', protect, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Přístup pouze pro administrátora.' });
  const { id } = req.params;
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ message: 'Heslo příliš krátké.' });
  try {
    let users = await loadUsers();
    const user = users.find(u => u.id === id);
    if (!user) return res.status(404).json({ message: 'Uživatel nenalezen.' });
    user.passwordHash = await bcrypt.hash(password, 10);
    await saveUsers(users);
    res.status(200).json({ message: 'Heslo změněno.' });
  } catch (error) {
    res.status(500).json({ message: 'Chyba.' });
  }
});

app.delete('/api/users/:id', protect, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Přístup pouze pro administrátora.' });
  const { id } = req.params;
  try {
    let users = await loadUsers();
    users = users.filter(u => u.id !== id);
    await saveUsers(users);
    res.status(200).json({ message: 'Uživatel smazán.' });
  } catch (error) {
    res.status(500).json({ message: 'Chyba.' });
  }
});

// --- AUTH Endpoints ---
app.post("/api/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    const users = await loadUsers();
    const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Neplatné přihlašovací údaje." });
    }
    const token = jwt.sign({ userId: user.id, username: user.username, role: user.role || 'user' }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, username: user.username, userId: user.id, role: user.role || 'user', color: user.color });
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
      role: users.length === 0 ? 'admin' : 'user'
    };
    users.push(newUser);
    await saveUsers(users);
    res.status(201).json({ message: "Registrace úspěšná." });
  } catch (error) {
    res.status(500).json({ message: "Chyba serveru." });
  }
});

// --- RESERVATIONS Endpoints ---
app.get("/api/reservations", protect, async (req, res) => {
  try {
    const reservations = await loadReservations();
    const users = await loadUsers();
    const userColorMap = new Map(users.map(u => [u.id, u.color]));
    const result = reservations.map(r => ({ ...r, userColor: userColorMap.get(r.userId) || '#808080' }));
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
    // ... (zde by byla validace kolizí, zkráceno pro přehlednost) ...
    const newReservation: Reservation = {
      id: uuidv4(),
      userId: req.user.userId,
      username: req.user.username,
      from,
      to,
      purpose,
      notes,
      status: 'primary' // zjednodušeno
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
        const resIdx = allReservations.findIndex(r => r.id === id);
        if (resIdx === -1) return res.status(404).json({ message: "Nenalezeno." });
        if (allReservations[resIdx].userId !== req.user.userId && req.user.role !== 'admin') return res.status(403).json({ message: "Bez oprávnění." });
        
        if(from) allReservations[resIdx].from = from;
        if(to) allReservations[resIdx].to = to;
        if(purpose) allReservations[resIdx].purpose = purpose;
        if(notes) allReservations[resIdx].notes = notes;
        
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
        const r = allReservations.find(r => r.id === id);
        if (!r) return res.status(404).json({ message: "Nenalezeno." });
        if (r.userId !== req.user.userId && req.user.role !== 'admin') return res.status(403).json({ message: "Bez oprávnění." });
        
        allReservations = allReservations.filter(res => res.id !== id);
        await saveReservation(allReservations);
        res.json({ message: "Smazáno." });
    } catch (error) {
        res.status(500).json({ message: "Chyba." });
    }
});

app.post("/api/reservations/:reservationId/assign", protect, async (req: Request, res: Response) => {
    // ... (implementace přiřazení, zkráceno) ...
    res.status(501).json({message: "Not implemented in this snippet"});
});

// --- SHOPPING LIST ---
app.get('/api/shopping-list', protect, async (req, res) => {
    try {
        const raw = await loadShoppingList(); // Načte itemy nebo listy
        // Zde pro zjednodušení vracíme pole seznamů
        // Reálně by loadShoppingList mělo vracet už strukturu listů
        res.json([{ id: 'default', name: 'Hlavní seznam', items: raw }]); 
    } catch (error) { res.status(500).json({message: "Chyba"}); }
});
// ... (zbytek shopping list endpointů zkrácen, zachovejte původní) ...

// --- NOTES ---
app.get('/api/notes', protect, async (req, res) => {
    try {
        const notes = await loadNotes();
        res.json(notes);
    } catch (error) { res.status(500).json({message: "Chyba"}); }
});
app.post('/api/notes', protect, async (req, res) => {
    if (!req.user) return res.status(401).json({message: "Neautorizováno"});
    const { message } = req.body;
    try {
        const notes = await loadNotes();
        const newNote = { id: uuidv4(), userId: req.user.userId, username: req.user.username, message, createdAt: new Date().toISOString() };
        notes.push(newNote);
        await saveNotes(notes);
        res.status(201).json(newNote);
    } catch (error) { res.status(500).json({message: "Chyba"}); }
});
app.delete('/api/notes/:id', protect, async (req, res) => {
    if (!req.user) return res.status(401).json({message: "Neautorizováno"});
    const { id } = req.params;
    try {
        let notes = await loadNotes();
        notes = notes.filter(n => n.id !== id);
        await saveNotes(notes);
        res.json({message: "Smazáno"});
    } catch (error) { res.status(500).json({message: "Chyba"}); }
});

// --- GALLERY ENDPOINTS (NOVÉ) ---

// 1. Složky
app.get('/api/gallery/folders', protect, async (req, res) => {
    try {
        const folders = await loadGalleryFolders();
        res.json(folders);
    } catch (error) {
        res.status(500).json({ message: "Chyba při načítání složek." });
    }
});

app.post('/api/gallery/folders', protect, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Neautorizováno" });
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Chybí název." });

    try {
        const folders = await loadGalleryFolders();
        const newFolder: GalleryFolder = {
            id: uuidv4(),
            name,
            createdAt: new Date().toISOString()
        };
        folders.push(newFolder);
        await saveGalleryFolders(folders);
        res.status(201).json(newFolder);
    } catch (error) {
        res.status(500).json({ message: "Chyba při vytváření složky." });
    }
});

// 2. Fotky (získání)
app.get('/api/gallery/photos', protect, async (req, res) => {
    try {
        const photos = await loadGalleryPhotos();
        const folderId = req.query.folderId;
        if (folderId) {
            const filtered = photos.filter(p => p.folderId === folderId);
            return res.json(filtered);
        }
        res.json(photos);
    } catch (error) {
        res.status(500).json({ message: "Chyba při načítání fotek." });
    }
});

// 3. Nahrávání fotek (Base64 -> File)
app.post('/api/gallery/photos', protect, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Neautorizováno" });
    const { folderId, imageBase64 } = req.body; // imageBase64: "data:image/png;base64,...."

    if (!folderId || !imageBase64) return res.status(400).json({ message: "Chybí data." });

    try {
        // 1. Dekódování Base64
        const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return res.status(400).json({ message: "Neplatný formát obrázku." });
        }
        
        const imageBuffer = Buffer.from(matches[2], 'base64');
        const extension = matches[1].split('/')[1] || 'jpg'; // např. 'png' z 'image/png'
        const fileName = `${uuidv4()}.${extension}`;
        const filePath = path.join(uploadsPath, fileName);

        // 2. Uložení souboru na disk
        await fs.promises.writeFile(filePath, imageBuffer);

        // 3. Uložení metadat do JSONu
        const photos = await loadGalleryPhotos();
        const newPhoto: GalleryPhoto = {
            id: uuidv4(),
            folderId,
            src: `/uploads/${fileName}`, // Cesta pro frontend
            uploadedBy: req.user.username,
            createdAt: new Date().toISOString()
        };
        photos.push(newPhoto);
        await saveGalleryPhotos(photos);

        res.status(201).json(newPhoto);
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ message: "Chyba při nahrávání fotky." });
    }
});

// 4. Mazání fotek
app.delete('/api/gallery/photos/:id', protect, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Neautorizováno" });
    const { id } = req.params;

    try {
        let photos = await loadGalleryPhotos();
        const photoIndex = photos.findIndex(p => p.id === id);
        
        if (photoIndex === -1) return res.status(404).json({ message: "Fotka nenalezena." });
        const photo = photos[photoIndex];

        // Oprávnění: Vlastník nebo Admin
        if (photo.uploadedBy !== req.user.username && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Nemáte oprávnění smazat tuto fotku." });
        }

        // 1. Smazat soubor z disku
        const fileName = photo.src.split('/uploads/')[1];
        if (fileName) {
            const filePath = path.join(uploadsPath, fileName);
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
            }
        }

        // 2. Smazat z JSONu
        photos.splice(photoIndex, 1);
        await saveGalleryPhotos(photos);

        res.json({ message: "Smazáno." });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ message: "Chyba při mazání." });
    }
});


app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../src/frontend/index.html'));
});

app.listen(port, () => {
  console.log(`Backend server naslouchá na http://localhost:${port}`);
});