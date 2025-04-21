// src/server.ts
import express, { Request, Response } from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { loadUsers, loadReservations, saveReservation } from "../utils/auth"; // Import funkce pro načtení
import { User, Reservation, JwtPayload } from "../types";
import { JWT_SECRET } from "../config/config"; // Import tajného klíče
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

// Login endpoint (z minula)
app.post("/api/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  // Základní validace vstupu
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Chybí uživatelské jméno nebo heslo." });
  }

  try {
    const users = await loadUsers();
    const user = users.find((u) => u.username === username);

    if (!user) {
      // Uživatele jsme nenašli
      return res.status(401).json({ message: "Neplatné přihlašovací údaje." });
    }

    // Porovnání zadaného hesla s uloženým hashem
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // Heslo nesedí
      return res.status(401).json({ message: "Neplatné přihlašovací údaje." });
    }

    // Heslo je správné - generujeme JWT token
    const payload = {
      userId: user.id,
      username: user.username,
      // Můžeš přidat další data, např. role, ale drž token malý
    };

    // Podepsání tokenu tajným klíčem
    // Nastavení expirace (např. 1 hodina, 1 den, atd.)
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" }); // Platnost 1 hodinu

    // Odeslání tokenu zpět klientovi
    res.json({ token, username: user.username, userId: user.id }); // Posíláme i jméno/id pro frontend
  } catch (error) {
    console.error("Chyba při přihlašování:", error);
    res.status(500).json({ message: "Došlo k chybě na serveru." });
  }
});

// --- Rezervační Endpointy ---

// GET /api/rezervace - Získání všech rezervací
// Tento endpoint zatím nechráníme, aby kdokoliv viděl obsazenost.
// Pokud bychom chtěli zobrazovat jména jen přihlášeným, logika by byla složitější.
app.get("/api/reservations", async (req, res) => {
  try {
    const reservation = await loadReservations();
    // Odešleme jen relevantní data (bez userId, pokud není potřeba na frontendu)
    const publicReservations = reservation.map(
      ({ id, userId, username, from, to: rezervaceTo }) => ({
        id,
        userId,
        username,
        from,
        to: rezervaceTo, // 'do' je rezervované slovo, tak přejmenujeme
      })
    );
    res.json(publicReservations);
  } catch (error) {
    console.error("Chyba při načítání rezervací (GET):", error);
    res.status(500).json({ message: "Chyba při načítání rezervací." });
  }
});

// POST /api/rezervace - Vytvoření nové rezervace (chráněno)
app.post("/api/reservations", protect, async (req: Request, res: Response) => {
  // Díky middleware 'protect' máme nyní přístup k req.user
  if (!req.user) {
    // Toto by nemělo nastat, pokud protect funguje správně, ale pro jistotu
    return res
      .status(401)
      .json({ message: "Neautorizováno (chybí uživatelská data)." });
  }

  const { from, to: reservationTo } = req.body; // Získání dat z těla požadavku
  const { userId, username } = req.user; // Získání dat z ověřeného tokenu

  // 1. Validace vstupů
  if (!from || !reservationTo) {
    return res.status(400).json({ message: 'Chybí datum "od" nebo "do".' });
  }
  // Jednoduchá validace formátu data (YYYY-MM-DD)
  const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateFormatRegex.test(from) || !dateFormatRegex.test(reservationTo)) {
    return res
      .status(400)
      .json({ message: "Neplatný formát data (očekáváno YYYY-MM-DD)." });
  }
  // Kontrola, zda 'do' není před 'od'
  if (new Date(reservationTo) < new Date(from)) {
    return res
      .status(400)
      .json({ message: 'Datum "do" nesmí být před datem "od".' });
  }

  try {
    // 2. Kontrola překryvu termínů
    const allReservations = await loadReservations();
    const isOverlap = allReservations.some((existing) => {
      const existingOd = new Date(existing.from);
      const existingDo = new Date(existing.to);
      const newOd = new Date(from);
      const newDo = new Date(reservationTo);

      // Logika kontroly překryvu:
      // Nový termín začíná PŘED koncem existujícího A nový termín končí PO začátku existujícího
      return newOd <= existingDo && newDo >= existingOd;
    });

    if (isOverlap) {
      console.warn(
        `[POST /api/rezervace] Pokus o rezervaci překrývajícího se termínu: ${from} - ${reservationTo}`
      );
      return res
        .status(409)
        .json({ message: "Tento termín je již částečně nebo zcela obsazen." }); // 409 Conflict
    }

    // 3. Vytvoření a uložení nové rezervace
    const newReservation: Reservation = {
      id: uuidv4(), // Vygenerujeme unikátní ID
      userId,
      username: username,
      from,
      to: reservationTo,
    };

    allReservations.push(newReservation);
    await saveReservation(allReservations);

    console.log(
      `[POST /api/rezervace] Uživatel ${username} (ID: ${userId}) vytvořil rezervaci: ${from} - ${reservationTo}`
    );
    res.status(201).json(newReservation); // Vrátíme vytvořenou rezervaci
  } catch (error) {
    console.error("Chyba při vytváření rezervace (POST):", error);
    res.status(500).json({ message: "Chyba při vytváření rezervace." });
  }
});

// --- Start serveru ---
app.listen(port, () => {
  console.log(`Backend server naslouchá na http://localhost:${port}`);
  // ... (výpis varování o JWT secret) ...
});

// Nezapomeň nainstalovat uuid a jeho typy:
// npm install uuid
// npm install @types/uuid --save-dev
