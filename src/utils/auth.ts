import fs from "fs/promises";
import path from "path";
import { User, Reservation, ShoppingListItem, Note, GalleryFolder, GalleryPhoto, DiaryFolder, DiaryEntry } from "../types";

const DATA_DIR = path.join(__dirname, "../../data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const RESERVATIONS_FILE = path.join(DATA_DIR, "reservations.json");
const SHOPPING_LIST_FILE = path.join(DATA_DIR, "shopping-list.json");
const NOTES_FILE = path.join(DATA_DIR, "notes.json");
const GALLERY_FOLDERS_FILE = path.join(DATA_DIR, "gallery_folders.json");
const GALLERY_PHOTOS_FILE = path.join(DATA_DIR, "gallery_photos.json");

// Nové soubory pro deník
const DIARY_FOLDERS_FILE = path.join(DATA_DIR, "diary_folders.json");
const DIARY_ENTRIES_FILE = path.join(DATA_DIR, "diary_entries.json");

// Helper to ensure file exists
async function ensureFile(filePath: string, defaultContent: any[]) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2));
  }
}

// Generic Load/Save
async function loadData<T>(filePath: string): Promise<T[]> {
  await ensureFile(filePath, []);
  const data = await fs.readFile(filePath, "utf-8");
  return JSON.parse(data);
}

async function saveData<T>(filePath: string, data: T[]): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Users
export const loadUsers = () => loadData<User>(USERS_FILE);
export const saveUsers = (users: User[]) => saveData(USERS_FILE, users);

// Reservations
export const loadReservations = () => loadData<Reservation>(RESERVATIONS_FILE);
export const saveReservation = (res: Reservation[]) => saveData(RESERVATIONS_FILE, res);

// Shopping List
export const loadShoppingList = () => loadData<ShoppingListItem>(SHOPPING_LIST_FILE);
export const saveShoppingLists = (list: ShoppingListItem[]) => saveData(SHOPPING_LIST_FILE, list);

// Notes
export const loadNotes = () => loadData<Note>(NOTES_FILE);
export const saveNotes = (notes: Note[]) => saveData(NOTES_FILE, notes);

// Gallery
export const loadGalleryFolders = () => loadData<GalleryFolder>(GALLERY_FOLDERS_FILE);
export const saveGalleryFolders = (folders: GalleryFolder[]) => saveData(GALLERY_FOLDERS_FILE, folders);

export const loadGalleryPhotos = () => loadData<GalleryPhoto>(GALLERY_PHOTOS_FILE);
export const saveGalleryPhotos = (photos: GalleryPhoto[]) => saveData(GALLERY_PHOTOS_FILE, photos);

// --- DIARY UTILS ---
export const loadDiaryFolders = () => loadData<DiaryFolder>(DIARY_FOLDERS_FILE);
export const saveDiaryFolders = (folders: DiaryFolder[]) => saveData(DIARY_FOLDERS_FILE, folders);

export const loadDiaryEntries = () => loadData<DiaryEntry>(DIARY_ENTRIES_FILE);
export const saveDiaryEntries = (entries: DiaryEntry[]) => saveData(DIARY_ENTRIES_FILE, entries);