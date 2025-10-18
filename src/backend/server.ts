import express, { Request, Response } from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  loadUsers,
  loadReservations,
  saveReservation,
  saveUsers,
} from "../utils/auth";
import { User, Reservation } from "../types";
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
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Přístup pouze pro administrátora.' });
  }
  try {
    const users = await loadUsers();
    res.json(users);
  } catch (error) {
    console.error('Chyba při načítání uživatelů:', error);
    res.status(500).json({ message: 'Chyba při načítání uživatelů.' });
  }
});

// Admin: Smazání uživatele
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
    const user = users.find((u) => u.username === username);

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

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

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

    // 4. Vytvoření nového uživatele
    const newUser: User = {
      id: uuidv4(),
      username,
      passwordHash,
      color,
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
    
    // Zjistíme, zda existuje PŘEKRÝVAJÍCÍ SE HLAVNÍ rezervace
    const overlappingPrimary = allReservations.find((existing) => {
      // Porovnáváme pouze s hlavními (primary) rezervacemi nebo starými daty bez statusu
      if (existing.status === 'backup') return false;

      const existingOd = new Date(existing.from);
      const existingDo = new Date(existing.to);
      const newOd = new Date(from);
      const newDo = new Date(reservationTo);
      
      // Podmínka pro překryv: newStart <= oldEnd AND newEnd >= oldStart
      return newOd <= existingDo && newDo >= existingOd;
    });

    const newReservation: Reservation = {
      id: uuidv4(),
      userId,
      username: username,
      from,
      to: reservationTo,
      purpose, // Uložíme účel
      notes,   // Uložíme poznámky
    };

    if (overlappingPrimary) {
      // Pokud existuje překryv, nová rezervace bude záložní
      newReservation.status = 'backup';
      newReservation.parentId = overlappingPrimary.id;
      console.warn(
        `[POST /api/reservations] Uživatel ${username} vytváří ZÁLOŽNÍ rezervaci pro termín: ${from} - ${reservationTo}`
      );
    } else {
      // Pokud není žádný překryv, je to hlavní rezervace
      newReservation.status = 'primary';
    }


    allReservations.push(newReservation);
    await saveReservation(allReservations);

    console.log(
      `[POST /api/reservace] Uživatel ${username} (ID: ${userId}) vytvořil ${newReservation.status} rezervaci: ${from} - ${reservationTo}`
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
    const { userId } = req.user;

    try {
        const allReservations = await loadReservations();
        const reservationIndex = allReservations.findIndex(r => r.id === id);

        if (reservationIndex === -1) {
            return res.status(404).json({ message: "Rezervace nenalezena." });
        }

        const reservation = allReservations[reservationIndex];

        // Ověření, zda uživatel může editovat tuto rezervaci
        if (reservation.userId !== userId) {
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

// DELETE /api/reservations/:id - Smazání existující rezervace (chráněno)
// POST /api/reservations/delete - Smazání existující rezervace (chráněno) - ZMĚNA Z DELETE NA POST
app.post("/api/reservations/delete", protect, async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: "Neautorizováno." });
    }

  const { id } = req.body; // Získání ID z těla požadavku
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

        const reservation = allReservations[reservationIndex];

    // Ověření, zda uživatel může mazat tuto rezervaci
    if (reservation.userId !== userId && role !== 'admin') {
      return res.status(403).json({ message: "Nemáte oprávnění smazat tuto rezervaci." });
    }

        // Smazání rezervace
        allReservations.splice(reservationIndex, 1);

        await saveReservation(allReservations);

        console.log(`[POST /api/reservations/delete] Uživatel ${req.user.username} smazal rezervaci ${id}.`);
        res.status(200).json({ message: "Rezervace byla úspěšně smazána." });

    } catch (error) {
        console.error(`Chyba při mazání rezervace (POST /api/reservations/delete):`, error);
        res.status(500).json({ message: "Chyba při mazání rezervace." });
    }
});


// --- Start serveru ---
app.listen(port, () => {
  console.log(`Backend server naslouchá na http://localhost:${port}`);
});
