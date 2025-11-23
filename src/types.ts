export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role?: 'admin' | 'user' | 'guest';
  color?: string;
}

export interface Reservation {
  id: string;
  userId: string;
  username: string;
  from: string;
  to: string;
  purpose?: string;
  notes?: string;
  userColor?: string;
  status?: 'primary' | 'backup';
  parentId?: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  icon?: string;
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

export interface ShoppingList {
  id: string;
  name: string;
  addedBy: string;
  addedById: string;
  createdAt: string;
  items: ShoppingListItem[];
}

export interface Note {
  id: string;
  userId: string;
  username: string;
  message: string;
  createdAt: string;
}

export interface JwtPayload {
  userId: string;
  username: string;
  role?: 'admin' | 'user' | 'guest';
  color?: string;
  iat: number;
  exp: number;
}

// --- NOVÉ TYPY PRO GALERII ---
export interface GalleryFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface GalleryPhoto {
  id: string;
  folderId: string;
  src: string; 
  uploadedBy: string;
  createdAt: string;
  description?: string; // Nové pole pro popis
}