export interface User {
  id: string;
  username: string;
  passwordHash: string;
}

export interface Reservation {
  id: string;
  userId: string;
  username: string;
  from: string;
  to: string;
}

export interface JwtPayload {
  userId: string;
  username: string;
  iat: number; // Čas vydání tokenu
  exp: number; // Čas expirace tokenu
}
