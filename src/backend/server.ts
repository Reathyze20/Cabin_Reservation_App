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

const app = express();
const port = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Endpointy ---

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
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    res.json({ token, username: user.username, userId: user.id });
  } catch (error) {
    console.error("Chyba při přihlašování:", error);
    res.status(500).json({ message: "Došlo k chybě na serveru." });
  }
});

// Register endpoint
app.post("/api/register", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  // 1. Základní validace
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Chybí uživatelské jméno nebo heslo." });
  }
  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Heslo musí mít alespoň 6 znaků." });
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
    // Vracíme všechna data, včetně nových polí purpose a notes
    res.json(reservations);
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
    const isOverlap = allReservations.some((existing) => {
      const existingOd = new Date(existing.from);
      const existingDo = new Date(existing.to);
      const newOd = new Date(from);
      const newDo = new Date(reservationTo);
      return newOd <= existingDo && newDo >= existingOd;
    });

    if (isOverlap) {
      console.warn(
        `[POST /api/rezervace] Pokus o rezervaci překrývajícího se termínu: ${from} - ${reservationTo}`
      );
      return res
        .status(409)
        .json({ message: "Tento termín je již částečně nebo zcela obsazen." });
    }

    const newReservation: Reservation = {
      id: uuidv4(),
      userId,
      username: username,
      from,
      to: reservationTo,
      purpose, // Uložíme účel
      notes,   // Uložíme poznámky
    };

    allReservations.push(newReservation);
    await saveReservation(allReservations);

    console.log(
      `[POST /api/rezervace] Uživatel ${username} (ID: ${userId}) vytvořil rezervaci: ${from} - ${reservationTo}`
    );
    res.status(201).json(newReservation);
  } catch (error) {
    console.error("Chyba při vytváření rezervace (POST):", error);
    res.status(500).json({ message: "Chyba při vytváření rezervace." });
  }
});

// --- Start serveru ---
app.listen(port, () => {
  console.log(`Backend server naslouchá na http://localhost:${port}`);
});
