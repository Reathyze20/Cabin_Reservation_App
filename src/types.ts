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
  purpose?: string; // Účel návštěvy (nepovinné)
  notes?: string;   // Poznámky (nepovinné)
  userColor?: string;
  status?: 'primary' | 'backup'; // "primary" je hlavní, "backup" je záložní
  parentId?: string; // ID hlavní rezervace, pokud je tato záložní
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
  price?: number;
}

export interface JwtPayload {
  userId: string;
  username: string;
  role?: 'admin' | 'user' | 'guest';
  color?: string;
  iat: number; // Čas vydání tokenu
  exp: number; // Čas expirace tokenu
}

