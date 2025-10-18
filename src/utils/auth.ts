import fs from "fs";
import path from "path";
import { Reservation, User, ShoppingListItem, Note } from "../types";

const usersFilePath = path.join(__dirname, "../../data/users.json");
const reservationsFilePath = path.join(
  __dirname,
  "../../data/reservations.json"
);
const shoppingListFilePath = path.join(
  __dirname,
  "../../data/shopping-list.json"
);
const notesFilePath = path.join(__dirname, "../../data/notes.json");


export async function loadUsers(): Promise<User[]> {
  try {
    const data = await fs.promises.readFile(usersFilePath, "utf-8");
    const users: User[] = JSON.parse(data);
    return users;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      await saveUsers([]);
      return [];
    }
    console.error("Chyba při načítání uživatelů:", error);
    return [];
  }
}

export async function saveUsers(users: User[]) {
  try {
    const data = JSON.stringify(users, null, 2);
    await fs.promises.writeFile(usersFilePath, data, "utf-8");
  } catch (error) {
    console.error("Chyba při ukládání uživatelů:", error);
    throw new Error("Chyba při ukládání uživatelů.");
  }
}

export async function loadReservations(): Promise<Reservation[]> {
  try {
    const data = await fs.promises.readFile(reservationsFilePath, "utf-8");
    const reservations: Reservation[] = JSON.parse(data);
    return reservations;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      await saveReservation([]);
      return [];
    }
    console.error(
      "!!! CHYBA při načítání nebo parsování reservations.json:",
      error
    );
    return [];
  }
}

export async function saveReservation(reservations: Reservation[]) {
  try {
    const data = JSON.stringify(reservations, null, 2); // Formátování pro lepší čitelnost
    await fs.promises.writeFile(reservationsFilePath, data, "utf-8");
  } catch (error) {
    console.error("Chyba při ukládání rezervací:", error);
    throw new Error("Chyba při ukládání rezervací.");
  }
}

export async function loadShoppingList(): Promise<ShoppingListItem[]> {
    try {
      const data = await fs.promises.readFile(shoppingListFilePath, "utf-8");
      // Old format (flat items) might exist — try to detect and migrate
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name && !parsed[0].items) {
        // It's old flat items -> wrap into a default list
        const defaultList = {
          id: 'default',
          name: 'Hlavní seznam',
          addedBy: 'system',
          addedById: 'system',
          createdAt: new Date().toISOString(),
          items: parsed as ShoppingListItem[],
        };
        await saveShoppingLists([defaultList]);
        return parsed as ShoppingListItem[];
      }
      // New format: array of ShoppingList
      const lists = (parsed as any[]) || [];
      // Flatten items for compatibility when calling old functions
      return lists.flatMap(l => (Array.isArray(l.items) ? l.items : [])) as ShoppingListItem[];
    } catch (error) {
     if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      await saveShoppingLists([]); // Create empty file
      return [];
    }
    console.error("Chyba při načítání nákupního seznamu:", error);
    return [];
  }
}

// New: save array of ShoppingList (each list contains items)
export async function saveShoppingLists(lists: any[]) {
  try {
    const data = JSON.stringify(lists, null, 2);
    await fs.promises.writeFile(shoppingListFilePath, data, "utf-8");
  } catch (error) {
    console.error("Chyba při ukládání nákupních seznamů:", error);
    throw new Error("Chyba při ukládání nákupních seznamů.");
  }
}

export async function loadNotes(): Promise<Note[]> {
  try {
    const data = await fs.promises.readFile(notesFilePath, "utf-8");
    return JSON.parse(data) as Note[];
  } catch (error) {
     if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      await saveNotes([]);
      return [];
    }
    console.error("Chyba při načítání vzkazů:", error);
    return [];
  }
}

export async function saveNotes(notes: Note[]) {
  try {
    const data = JSON.stringify(notes, null, 2);
    await fs.promises.writeFile(notesFilePath, data, "utf-8");
  } catch (error) {
    console.error("Chyba při ukládání vzkazů:", error);
    throw new Error("Chyba při ukládání vzkazů.");
  }
}
