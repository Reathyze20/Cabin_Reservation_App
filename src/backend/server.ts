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
} from "../utils/auth";
import fs from 'fs';
import { User, Reservation, ShoppingListItem, Note } from "../types";
import { JWT_SECRET } from "../config/config";
import { protect } from "../middleware/authMiddleware";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const app = express();

const port = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

const frontendPath = path.join(__dirname, "../../src/frontend");
app.use(express.static(frontendPath));

// --- Endpointy ---
// Admin: Získání seznamu uživatelů
app.get('/api/users', protect, async (req: Request, res: Response) => {
  // Oproti původní verzi vracíme jen bezpečná data, aby se hesla nedostala na frontend
  try {
    const users = await loadUsers();
    const safeUsers = users.map(({ id, username, color, role }) => ({ id, username, color, role }));
    res.json(safeUsers);
  } catch (error) {
    console.error('Chyba při načítání uživatelů:', error);
    res.status(500).json({ message: 'Chyba při načítání uživatelů.' });
  }
});


// Admin: Smazání všech rezervací uživatele
app.delete('/api/users/:id/reservations', protect, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Přístup pouze pro administrátora.' });
  }
  const { id } = req.params;
  try {
    let reservations = await loadReservations();
    const beforeCount = reservations.length;
    reservations = reservations.filter(r => r.userId !== id);
    await saveReservation(reservations);
    res.status(200).json({ message: `Smazáno ${beforeCount - reservations.length} rezervací.` });
  } catch (error) {
    res.status(500).json({ message: 'Chyba při mazání rezervací uživatele.' });
  }
});
// Admin: Změna role uživatele
app.put('/api/users/:id/role', protect, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Přístup pouze pro administrátora.' });
  }
  const { id } = req.params;
  const { role } = req.body;
  if (!role || !['admin', 'user', 'guest'].includes(role)) {
    return res.status(400).json({ message: 'Neplatná role.' });
  }
  try {
    let users = await loadUsers();
    const user = users.find(u => u.id === id);
    if (!user) return res.status(404).json({ message: 'Uživatel nenalezen.' });
    // Pokud měníme admina na jinou roli, ověřit že zůstane alespoň jeden admin
    if (user.role === 'admin' && role !== 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'V systému musí zůstat alespoň jeden admin.' });
      }
    }
    user.role = role;
    await saveUsers(users);
    res.status(200).json({ message: 'Role změněna.' });
  } catch (error) {
    res.status(500).json({ message: 'Chyba při změně role.' });
  }
});

// Admin: Reset hesla uživatele
app.put('/api/users/:id/password', protect, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Přístup pouze pro administrátora.' });
  }
  const { id } = req.params;
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Heslo musí mít alespoň 6 znaků.' });
  }
  try {
    let users = await loadUsers();
    const user = users.find(u => u.id === id);
    if (!user) return res.status(404).json({ message: 'Uživatel nenalezen.' });
    const saltRounds = 10;
    user.passwordHash = await bcrypt.hash(password, saltRounds);
    await saveUsers(users);
    res.status(200).json({ message: 'Heslo změněno.' });
  } catch (error) {
    res.status(500).json({ message: 'Chyba při změně hesla.' });
  }
});

// Admin: Smazání uživatele
app.delete('/api/users/:id', protect, async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Přístup pouze pro administrátora.' });
  }
  const { id } = req.params;
  try {
    let users = await loadUsers();
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({ message: 'Uživatel nenalezen.' });
    }
    users.splice(userIndex, 1);
    await saveUsers(users);
    res.status(200).json({ message: 'Uživatel byl úspěšně smazán.' });
  } catch (error) {
    console.error('Chyba při mazání uživatele:', error);
    res.status(500).json({ message: 'Chyba při mazání uživatele.' });
  }
});

// Základní endpoint
app.get("/", (req, res) => {
  res.send("Backend běží!");
});

// Login endpoint
app.post("/api/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Chybí uživatelské jméno nebo heslo." });
  }

  try {
    const users = await loadUsers();
    const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());

    if (!user) {
      return res.status(401).json({ message: "Neplatné přihlašovací údaje." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Neplatné přihlašovací údaje." });
    }

    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role || 'user',
      color: user.color,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" }); // Prodloužení tokenu

  res.json({ token, username: user.username, userId: user.id, role: user.role || 'user', color: user.color });
  } catch (error) {
    console.error("Chyba při přihlašování:", error);
    res.status(500).json({ message: "Došlo k chybě na serveru." });
  }
});

// Register endpoint
app.post("/api/register", async (req: Request, res: Response) => {
  const { username, password, color } = req.body;

  // 1. Základní validace
  if (!username || !password || !color) {
    return res
      .status(400)
      .json({ message: "Chybí uživatelské jméno, heslo nebo barva." });
  }
  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Heslo musí mít alespoň 6 znaků." });
  }
  if (!/^#[0-9A-F]{6}$/i.test(color)) {
      return res.status(400).json({ message: "Neplatný formát barvy." });
  }

  try {
    const users = await loadUsers();

    // 2. Kontrola, zda uživatel již existuje
    const userExists = users.some(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );
    if (userExists) {
      return res
        .status(409)
        .json({ message: "Uživatel s tímto jménem již existuje." });
    }

    // 3. Hashování nového hesla
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 4. Vytvoření nového uživatele - první uživatel je admin
    const newUser: User = {
      id: uuidv4(),
      username,
      passwordHash,
      color,
      role: users.length === 0 ? 'admin' : 'user'
    };

    // 5. Přidání a uložení uživatele
    users.push(newUser);
    await saveUsers(users);

    console.log(
      `[POST /api/register] Nový uživatel ${username} byl zaregistrován.`
    );
    res
      .status(201)
      .json({
        message: "Registrace proběhla úspěšně. Nyní se můžete přihlásit.",
      });
  } catch (error) {
    console.error("Chyba při registraci:", error);
    res.status(500).json({ message: "Došlo k chybě na serveru." });
  }
});


// --- Rezervační Endpointy ---

// GET /api/rezervace - Získání všech rezervací
app.get("/api/reservations", protect, async (req, res) => {
  try {
    const reservations = await loadReservations();
    const users = await loadUsers();

    const userColorMap = new Map(users.map(u => [u.id, u.color]));

    const reservationsWithColors = reservations.map(r => ({
      ...r,
      userColor: userColorMap.get(r.userId) || '#808080' // Default grey if user has no color
    }));

    res.json(reservationsWithColors);
  } catch (error) {
    console.error("Chyba při načítání rezervací (GET):", error);
    res.status(500).json({ message: "Chyba při načítání rezervací." });
  }
});

// POST /api/rezervace - Vytvoření nové rezervace (chráněno)
app.post("/api/reservations", protect, async (req: Request, res: Response) => {
  if (!req.user) {
    return res
      .status(401)
      .json({ message: "Neautorizováno (chybí uživatelská data)." });
  }

  const { from, to: reservationTo, purpose, notes } = req.body;
  const { userId, username } = req.user;

  if (!from || !reservationTo) {
    return res.status(400).json({ message: 'Chybí datum "od" nebo "do".' });
  }
  const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateFormatRegex.test(from) || !dateFormatRegex.test(reservationTo)) {
    return res
      .status(400)
      .json({ message: "Neplatný formát data (očekáváno YYYY-MM-DD)." });
  }
  if (new Date(reservationTo) < new Date(from)) {
    return res
      .status(400)
      .json({ message: 'Datum "do" nesmí být před datem "od".' });
  }

  try {
    const allReservations = await loadReservations();
    
    // 1. Validace: Nemůže stejný uživatel vytvořit duplicitní rezervaci na stejný termín
    const userHasOverlap = allReservations.some(existing => {
        if (existing.userId !== userId) return false; // Kontrolujeme pouze rezervace aktuálního uživatele
        const existingOd = new Date(existing.from);
        const existingDo = new Date(existing.to);
        const newOd = new Date(from);
        const newDo = new Date(reservationTo);
        return newOd <= existingDo && newDo >= existingOd;
    });
    
    if (userHasOverlap) {
        return res.status(409).json({ message: "Již máte rezervaci v tomto termínu." });
    }

    // 2. Zjištění, zda existuje primární rezervace v daném termínu od jiného uživatele
    const primaryOverlap = allReservations.find((existing) => {
      if (existing.status === 'backup') return false; // Ignorujeme záložní rezervace pro účely blokace
      const existingOd = new Date(existing.from);
      const existingDo = new Date(existing.to);
      const newOd = new Date(from);
      const newDo = new Date(reservationTo);
      return newOd <= existingDo && newDo >= existingOd;
    });

    const newReservation: Reservation = {
      id: uuidv4(),
      userId,
      username: username,
      from,
      to: reservationTo,
      purpose,
      notes,
      status: primaryOverlap ? 'backup' : 'primary', // Nastavení statusu
      parentId: primaryOverlap ? primaryOverlap.id : undefined, // Odkaz na primární rezervaci
    };

    allReservations.push(newReservation);
    await saveReservation(allReservations);

    console.log(
      `[POST /api/rezervace] Uživatel ${username} (ID: ${userId}) vytvořil ${newReservation.status} rezervaci: ${from} - ${reservationTo}`
    );
        res.status(201).json(newReservation);
  } catch (error) {
    console.error("Chyba při vytváření rezervace (POST):", error);
    res.status(500).json({ message: "Chyba při vytváření rezervace." });
  }
});

// PUT /api/reservations/:id - Aktualizace existující rezervace (chráněno)
app.put("/api/reservations/:id", protect, async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: "Neautorizováno." });
    }

    const { id } = req.params;
  const { purpose, notes, from, to } = req.body;
    const { userId, role } = req.user;

    try {
        const allReservations = await loadReservations();
        const reservationIndex = allReservations.findIndex(r => r.id === id);

        if (reservationIndex === -1) {
            return res.status(404).json({ message: "Rezervace nenalezena." });
        }

        const reservation = allReservations[reservationIndex];

        // Ověření, zda uživatel může editovat tuto rezervaci (vlastník nebo admin)
        if (reservation.userId !== userId && role !== 'admin') {
            return res.status(403).json({ message: "Nemáte oprávnění upravit tuto rezervaci." });
        }

      // Aktualizace dat
      if (from) reservation.from = from;
      if (to) reservation.to = to;
      reservation.purpose = purpose;
      reservation.notes = notes;

        await saveReservation(allReservations);

        console.log(`[PUT /api/reservations/${id}] Uživatel ${req.user.username} aktualizoval rezervaci.`);
        res.status(200).json(reservation);

    } catch (error) {
        console.error(`Chyba při aktualizaci rezervace (PUT /api/reservations/${id}):`, error);
        res.status(500).json({ message: "Chyba při aktualizaci rezervace." });
    }
});

// POST /api/reservations/delete - Smazání existující rezervace (chráněno)
app.post("/api/reservations/delete", protect, async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: "Neautorizováno." });
    }

  const { id } = req.body; 
  const { userId, role } = req.user;

    if (!id) {
        return res.status(400).json({ message: "Chybí ID rezervace." });
    }

    try {
        let allReservations = await loadReservations();
        const reservationIndex = allReservations.findIndex(r => r.id === id);

        if (reservationIndex === -1) {
            return res.status(404).json({ message: "Rezervace nenalezena." });
        }

        const reservationToDelete = allReservations[reservationIndex];

        // Ověření, zda uživatel může mazat tuto rezervaci
        if (reservationToDelete.userId !== userId && role !== 'admin') {
          return res.status(403).json({ message: "Nemáte oprávnění smazat tuto rezervaci." });
        }

        // Smazání rezervace
        allReservations.splice(reservationIndex, 1);

        // Pokud byla smazaná rezervace primární, zkusíme povýšit záložní
        if (reservationToDelete.status !== 'backup') {
            const backupToPromote = allReservations.find(r => r.parentId === reservationToDelete.id);
            if (backupToPromote) {
                backupToPromote.status = 'primary';
                delete backupToPromote.parentId; // Odebereme odkaz na již neexistující primární rezervaci
            }
        }

        await saveReservation(allReservations);

        console.log(`[POST /api/reservations/delete] Uživatel ${req.user.username} smazal rezervaci ${id}.`);
        res.status(200).json({ message: "Rezervace byla úspěšně smazána." });

    } catch (error) {
        console.error(`Chyba při mazání rezervace (POST /api/reservations/delete):`, error);
        res.status(500).json({ message: "Chyba při mazání rezervace." });
    }
});

// --- Shopping List Endpoints ---

// GET /api/shopping-list
app.get('/api/shopping-list', protect, async (req, res) => {
    try {
    // Return array of shopping lists
    const raw = await loadShoppingList();
    // loadShoppingList returns flattened items for backward compatibility; attempt to read lists file directly
    const listsPath = path.join(__dirname, '../../data/shopping-list.json');
    let listsData = [];
    try {
      const content = await fs.promises.readFile(listsPath, 'utf-8');
      listsData = JSON.parse(content);
    } catch (e) {
      // If not present, create default list from flat items
      const defaultList = {
        id: 'default',
        name: 'Hlavní seznam',
        addedBy: 'system',
        addedById: 'system',
        createdAt: new Date().toISOString(),
        items: raw
      };
      listsData = [defaultList];
      await saveShoppingLists(listsData);
    }
    res.json(listsData);
    } catch (error) {
        res.status(500).json({ message: 'Chyba při načítání nákupního seznamu.' });
    }
});

// POST /api/shopping-list
// POST /api/shopping-list - create a new shopping list (name required)
app.post('/api/shopping-list', protect, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Neautorizováno.' });
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ message: 'Název seznamu je povinný.' });
  }
  try {
    const listsPath = path.join(__dirname, '../../data/shopping-list.json');
    let lists = [];
    try {
      const content = await fs.promises.readFile(listsPath, 'utf-8');
      lists = JSON.parse(content);
    } catch (e) {
      lists = [];
    }
    const newList = {
      id: uuidv4(),
      name: name.trim(),
      addedBy: req.user.username,
      addedById: req.user.userId,
      createdAt: new Date().toISOString(),
      items: []
    };
    lists.push(newList);
    await saveShoppingLists(lists);
    res.status(201).json(newList);
  } catch (error) {
    res.status(500).json({ message: 'Chyba při ukládání seznamu.' });
  }
});

// POST /api/shopping-list/:listId/items - add item to list
app.post('/api/shopping-list/:listId/items', protect, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Neautorizováno.' });
  const { listId } = req.params;
  const { name, icon } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ message: 'Název položky je povinný.' });
  }
  try {
    const listsPath = path.join(__dirname, '../../data/shopping-list.json');
    const content = await fs.promises.readFile(listsPath, 'utf-8');
    const lists = JSON.parse(content);
    const list = lists.find((l: any) => l.id === listId);
    if (!list) return res.status(404).json({ message: 'Seznam nenalezen.' });
    const newItem: any = {
      id: uuidv4(),
      name: name.trim(),
      icon: icon || 'fas fa-shopping-basket',
      addedBy: req.user.username,
      addedById: req.user.userId,
      createdAt: new Date().toISOString(),
      purchased: false,
    };
    list.items.push(newItem);
    await saveShoppingLists(lists);
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ message: 'Chyba při přidání položky.' });
  }
});

// PUT /api/shopping-list/:id/purchase
// PUT toggle purchase for item inside a list
app.put('/api/shopping-list/:listId/items/:id/purchase', protect, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: 'Neautorizováno.' });
    
  const { listId, id } = req.params;
  const { purchased, price, splitWith } = req.body;

    if (typeof purchased !== 'boolean') {
        return res.status(400).json({ message: 'Chybí stav "zakoupeno".' });
    }

    try {
    const listsPath = path.join(__dirname, '../../data/shopping-list.json');
    const content = await fs.promises.readFile(listsPath, 'utf-8');
    const lists = JSON.parse(content);
    const list = lists.find((l: any) => l.id === listId);
    if (!list) return res.status(404).json({ message: 'Seznam nenalezen.' });
    const item = list.items.find((it: any) => it.id === id);
    if (!item) return res.status(404).json({ message: 'Položka nenalezena.' });
    item.purchased = purchased;
        if (purchased) {
            item.purchasedBy = req.user.username;
            item.purchasedById = req.user.userId;
            item.purchasedAt = new Date().toISOString();
            item.price = price ? parseFloat(price) : undefined;
            item.splitWith = Array.isArray(splitWith) ? splitWith : [];
        } else {
            delete item.purchasedBy;
            delete item.purchasedById;
            delete item.price;
            delete item.purchasedAt;
            delete item.splitWith;
        }

    await saveShoppingLists(lists);
    res.json(item);
    } catch (error) {
        res.status(500).json({ message: 'Chyba při aktualizaci položky.' });
    }
});
// DELETE item from list
app.delete('/api/shopping-list/:listId/items/:id', protect, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: 'Neautorizováno.' });
    
  const { listId, id } = req.params;
  const { userId, role } = req.user;

  try {
    const listsPath = path.join(__dirname, '../../data/shopping-list.json');
    const content = await fs.promises.readFile(listsPath, 'utf-8');
    const lists = JSON.parse(content);
    const list = lists.find((l: any) => l.id === listId);
    if (!list) return res.status(404).json({ message: 'Seznam nenalezen.' });
    const itemIndex = list.items.findIndex((it: any) => it.id === id);
    if (itemIndex === -1) return res.status(404).json({ message: 'Položka nenalezena.' });

    const itemToDelete = list.items[itemIndex];
    if (role !== 'admin' && itemToDelete.addedById !== userId) {
      return res.status(403).json({ message: 'Nemáte oprávnění smazat tuto položku.' });
    }
    list.items.splice(itemIndex, 1);
    await saveShoppingLists(lists);
    res.status(200).json({ message: 'Položka smazána.' });
  } catch (error) {
    res.status(500).json({ message: 'Chyba při mazání položky.' });
  }
});

// DELETE entire list
app.delete('/api/shopping-list/:listId', protect, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Neautorizováno.' });
  const { listId } = req.params;
  const { userId, role } = req.user;
  try {
    const listsPath = path.join(__dirname, '../../data/shopping-list.json');
    const content = await fs.promises.readFile(listsPath, 'utf-8');
    const lists = JSON.parse(content);
    const listIndex = lists.findIndex((l: any) => l.id === listId);
    if (listIndex === -1) return res.status(404).json({ message: 'Seznam nenalezen.' });
    const list = lists[listIndex];
    if (role !== 'admin' && list.addedById !== userId) {
      return res.status(403).json({ message: 'Nemáte oprávnění smazat tento seznam.' });
    }
    lists.splice(listIndex, 1);
    await saveShoppingLists(lists);
    res.status(200).json({ message: 'Seznam smazán.' });
  } catch (error) {
    res.status(500).json({ message: 'Chyba při mazání seznamu.' });
  }
});

// --- Notes (Nástěnka) Endpoints ---

// GET /api/notes
app.get('/api/notes', protect, async (req, res) => {
    try {
        const notes = await loadNotes();
        res.json(notes);
    } catch (error) {
        res.status(500).json({ message: 'Chyba při načítání vzkazů.' });
    }
});

// POST /api/notes
app.post('/api/notes', protect, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: 'Neautorizováno.' });
    const { message } = req.body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ message: 'Vzkaz nemůže být prázdný.' });
    }

    try {
        const notes = await loadNotes();
        const newNote: Note = {
            id: uuidv4(),
            message: message.trim(),
            username: req.user.username,
            userId: req.user.userId,
            createdAt: new Date().toISOString(),
        };
        notes.push(newNote);
        await saveNotes(notes);
        res.status(201).json(newNote);
    } catch (error) {
        res.status(500).json({ message: 'Chyba při ukládání vzkazu.' });
    }
});

// DELETE /api/notes/:id
app.delete('/api/notes/:id', protect, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: 'Neautorizováno.' });
    
    const { id } = req.params;
    const { userId, role } = req.user;

    try {
        let notes = await loadNotes();
        const noteIndex = notes.findIndex(note => note.id === id);

        if (noteIndex === -1) {
            return res.status(404).json({ message: 'Vzkaz nenalezen.' });
        }
        
        const noteToDelete = notes[noteIndex];

        if (role !== 'admin' && noteToDelete.userId !== userId) {
            return res.status(403).json({ message: 'Nemáte oprávnění smazat tento vzkaz.' });
        }

        notes.splice(noteIndex, 1);
        await saveNotes(notes);
        res.status(200).json({ message: 'Vzkaz smazán.' });
    } catch (error) {
        res.status(500).json({ message: 'Chyba při mazání vzkazu.' });
    }
});


// --- Serve frontend ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../src/frontend/index.html'));
});


// --- Start serveru ---
app.listen(port, () => {
  console.log(`Backend server naslouchá na http://localhost:${port}`);
});

