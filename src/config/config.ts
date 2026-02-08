import dotenv from "dotenv";
import path from "path";
import logger from "../utils/logger";

const __dirname = import.meta.dirname;
dotenv.config({ path: path.join(__dirname, "../../.env") });

// JWT Configuration
export const JWT_SECRET = process.env.JWT_SECRET || "TotoJeVelmiTajneHeslo";

// Database Configuration
export const DATABASE_URL = process.env.DATABASE_URL || "";

// Server Configuration
export const PORT = parseInt(process.env.PORT || "3000", 10);

if (JWT_SECRET === "TotoJeVelmiTajneHeslo") {
  if (process.env.NODE_ENV === "production") {
    logger.error("CONFIG", "FATAL: JWT_SECRET is not set! Cannot start in production with default secret.");
    process.exit(1);
  }
  logger.warn("CONFIG", "Používáte výchozí tajný klíč pro JWT. Změňte ho v .env souboru!");
}

if (!DATABASE_URL) {
  logger.error("CONFIG", "FATAL: DATABASE_URL is not set!");
  process.exit(1);
}
