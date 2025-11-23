import fs from "fs";
import path from "path";
import { Reservation, User, ShoppingListItem, Note, GalleryFolder, GalleryPhoto } from "../types";

const usersFilePath = path.join(__dirname, "../../data/users.json");
const reservationsFilePath = path.join(__dirname, "../../data/reservations.json");
const shoppingListFilePath = path.join(__dirname, "../../data/shopping-list.json");
const notesFilePath = path.join(__dirname, "../../data/notes.json");
const galleryFoldersPath = path.join(__dirname, "../../data/gallery-folders.json");
const galleryPhotosPath = path.join(__dirname, "../../data/gallery-photos.json");

// --- Users ---
export async function loadUsers(): Promise<User[]> {
  try {
    const data = await fs.promises.readFile(usersFilePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // Pokud soubor neexistuje, vytvoříme prázdný
    if (error instanceof Error && "code" in error && (error as any).code === "ENOENT") {
      await saveUsers([]);
      return [];
    }
    console.error("Chyba při načítání uživatelů:", error);
    return [];
  }
}

export async function saveUsers(users: User[]) {
  const data = JSON.stringify(users, null, 2);
  await fs.promises.writeFile(usersFilePath, data, "utf-8");
}

// --- Reservations ---
export async function loadReservations(): Promise<Reservation[]> {
  try {
    const data = await fs.promises.readFile(reservationsFilePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as any).code === "ENOENT") {
      await saveReservation([]);
      return [];
    }
    console.error("Chyba při načítání rezervací:", error);
    return [];
  }
}

export async function saveReservation(reservations: Reservation[]) {
  const data = JSON.stringify(reservations, null, 2);
  await fs.promises.writeFile(reservationsFilePath, data, "utf-8");
}

// --- Shopping List ---
export async function loadShoppingList(): Promise<ShoppingListItem[]> {
    try {
      const data = await fs.promises.readFile(shoppingListFilePath, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name && !parsed[0].items) {
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
      const lists = (parsed as any[]) || [];
      return lists.flatMap(l => (Array.isArray(l.items) ? l.items : [])) as ShoppingListItem[];
    } catch (error) {
     if (error instanceof Error && "code" in error && (error as any).code === "ENOENT") {
      await saveShoppingLists([]);
      return [];
    }
    console.error("Chyba při načítání nákupního seznamu:", error);
    return [];
  }
}

export async function saveShoppingLists(lists: any[]) {
  const data = JSON.stringify(lists, null, 2);
  await fs.promises.writeFile(shoppingListFilePath, data, "utf-8");
}

// --- Notes ---
export async function loadNotes(): Promise<Note[]> {
  try {
    const data = await fs.promises.readFile(notesFilePath, "utf-8");
    return JSON.parse(data) as Note[];
  } catch (error) {
     if (error instanceof Error && "code" in error && (error as any).code === "ENOENT") {
      await saveNotes([]);
      return [];
    }
    console.error("Chyba při načítání vzkazů:", error);
    return [];
  }
}

export async function saveNotes(notes: Note[]) {
  const data = JSON.stringify(notes, null, 2);
  await fs.promises.writeFile(notesFilePath, data, "utf-8");
}

// --- Gallery Folders ---
export async function loadGalleryFolders(): Promise<GalleryFolder[]> {
  try {
    const data = await fs.promises.readFile(galleryFoldersPath, "utf-8");
    return JSON.parse(data) as GalleryFolder[];
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as any).code === "ENOENT") {
      await saveGalleryFolders([]);
      return [];
    }
    return [];
  }
}

export async function saveGalleryFolders(folders: GalleryFolder[]) {
  const data = JSON.stringify(folders, null, 2);
  await fs.promises.writeFile(galleryFoldersPath, data, "utf-8");
}

// --- Gallery Photos ---
export async function loadGalleryPhotos(): Promise<GalleryPhoto[]> {
  try {
    const data = await fs.promises.readFile(galleryPhotosPath, "utf-8");
    return JSON.parse(data) as GalleryPhoto[];
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as any).code === "ENOENT") {
      await saveGalleryPhotos([]);
      return [];
    }
    return [];
  }
}

export async function saveGalleryPhotos(photos: GalleryPhoto[]) {
  const data = JSON.stringify(photos, null, 2);
  await fs.promises.writeFile(galleryPhotosPath, data, "utf-8");
}