import dotenv from "dotenv";

dotenv.config();

// JWT Configuration
export const JWT_SECRET = process.env.JWT_SECRET || "TotoJeVelmiTajneHeslo";

// Database Configuration
export const DATABASE_URL = process.env.DATABASE_URL || "";

// Server Configuration
export const PORT = parseInt(process.env.PORT || "3000", 10);

if (JWT_SECRET === "TotoJeVelmiTajneHeslo") {
  console.warn(
    "Používáte výchozí tajný klíč pro JWT. Změňte ho v .env souboru!"
  );
}
