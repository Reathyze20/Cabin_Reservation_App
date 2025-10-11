export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role?: 'admin' | 'user';
}

export interface Reservation {
  id: string;
  userId: string;
  username: string;
  from: string;
  to: string;
  purpose?: string; // Účel návštěvy (nepovinné)
  notes?: string;   // Poznámky (nepovinné)
}

export interface JwtPayload {
  userId: string;
  username: string;
  role?: 'admin' | 'user';
  iat: number; // Čas vydání tokenu
  exp: number; // Čas expirace tokenu
}
