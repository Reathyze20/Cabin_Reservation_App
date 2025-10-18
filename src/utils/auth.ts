import fs from "fs";
import path from "path";
import { Reservation, User, ShoppingListItem } from "../types";

const usersFilePath = path.join(__dirname, "../../data/users.json");
const reservationsFilePath = path.join(
  __dirname,
  "../../data/reservations.json"
);
const shoppingListFilePath = path.join(
  __dirname,
  "../../data/shopping-list.json"
);


export async function loadUsers(): Promise<User[]> {
  try {
    const data = await fs.promises.readFile(usersFilePath, "utf-8");
    const users: User[] = JSON.parse(data);
    return users;
  } catch (error) {
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
      console.warn("Soubor reservations.json nenalezen, vracím prázdné pole.");
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
    return JSON.parse(data) as ShoppingListItem[];
  } catch (error) {
     if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      await saveShoppingList([]); // Vytvoří prázdný soubor, pokud neexistuje
      return [];
    }
    console.error("Chyba při načítání nákupního seznamu:", error);
    return [];
  }
}

export async function saveShoppingList(items: ShoppingListItem[]) {
  try {
    const data = JSON.stringify(items, null, 2);
    await fs.promises.writeFile(shoppingListFilePath, data, "utf-8");
  } catch (error) {
    console.error("Chyba při ukládání nákupního seznamu:", error);
    throw new Error("Chyba při ukládání nákupního seznamu.");
  }
}
