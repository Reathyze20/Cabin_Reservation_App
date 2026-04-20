import dotenv from "dotenv";
import path from "path";
import logger from "../utils/logger";

import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

// JWT Configuration
export const JWT_SECRET = process.env.JWT_SECRET || "TotoJeVelmiTajneHeslo";

// Database Configuration
export const DATABASE_URL = process.env.DATABASE_URL || "";

// Server Configuration
export const PORT = parseInt(process.env.PORT || "3000", 10);

// Uploads — configurable via UPLOADS_PATH env var (Docker mounts, custom paths)
const defaultUploads = path.join(__dirname, "../../data/uploads");
export const UPLOADS_PATH = process.env.UPLOADS_PATH || defaultUploads;
export const THUMBS_PATH = path.join(UPLOADS_PATH, "thumbs");

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

// SMTP Configuration — Amazon SES (Frankfurt eu-central-1)
export const SMTP_HOST = process.env.SMTP_HOST || "";
export const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
export const SMTP_USER = process.env.SMTP_USER || "";
export const SMTP_PASS = process.env.SMTP_PASS || "";
export const EMAIL_FROM = process.env.EMAIL_FROM || '"Chatačeskéstředohoří" <noreply@chataceskestredohori.cz>';

// Frontend URL (for verification links in emails)
export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
