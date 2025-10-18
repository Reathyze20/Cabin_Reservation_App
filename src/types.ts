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
}

export interface JwtPayload {
  userId: string;
  username: string;
  role?: 'admin' | 'user' | 'guest';
  color?: string;
  iat: number; // Čas vydání tokenu
  exp: number; // Čas expirace tokenu
}
