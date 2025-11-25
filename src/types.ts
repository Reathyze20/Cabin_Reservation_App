export interface User {
  id: string;
  username: string;
  passwordHash: string;
  color: string;
  role?: "admin" | "user" | "guest";
}

export interface Reservation {
  id: string;
  userId: string;
  username: string;
  from: string;
  to: string;
  purpose: string;
  notes?: string;
  status?: "primary" | "backup";
  userColor?: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  addedBy: string;
  addedById: string;
  createdAt: string;
  purchased: boolean;
  purchasedBy?: string;
  purchasedById?: string;
  purchasedAt?: string;
  price?: number;
  splitWith?: string[];
}

export interface Note {
  id: string;
  userId: string;
  username: string;
  message: string;
  createdAt: string;
}

export interface GalleryFolder {
  id: string;
  name: string;
  createdAt: string;
  createdBy?: string;
}

export interface GalleryPhoto {
  id: string;
  folderId: string;
  src: string;
  uploadedBy: string;
  createdAt: string;
  description?: string;
}

// --- DENÍK ---
export interface DiaryFolder {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  startDate?: string; // Datum od (ISO string YYYY-MM-DD)
  endDate?: string; // Datum do (ISO string YYYY-MM-DD)
}

export interface DiaryEntry {
  id: string;
  folderId: string;
  date: string;
  content: string;
  author: string;
  authorId: string;
  createdAt: string;
}
