import fs from "fs";
import path from "path";
import { Reservation, User } from "../types";

const usersFilePath = path.join(__dirname, "../backend/data/users.json");
const reservationsFilePath = path.join(
  __dirname,
  "../backend/data/reservations.json"
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
