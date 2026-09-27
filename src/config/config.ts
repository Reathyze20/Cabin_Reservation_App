import dotenv from "dotenv";
import path from "path";
import logger from "../utils/logger";

import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

// JWT Configuration — no fallback: the app refuses to start without a real secret.
const KNOWN_PLACEHOLDER_SECRETS = new Set([
  "TotoJeVelmiTajneHeslo",
  "vas_super_tajny_klic_ktery_nikdo_neuhodne",
  "your-secret-key",
  "change_me",
]);
const MIN_JWT_SECRET_LENGTH = 32;

function readJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim() ?? "";

  if (!secret) {
    logger.error("CONFIG", "FATAL: JWT_SECRET is not set! Add it to .env (see .env.example).");
    process.exit(1);
  }

  if (KNOWN_PLACEHOLDER_SECRETS.has(secret)) {
    logger.error("CONFIG", "FATAL: JWT_SECRET uses a known placeholder value. Generate a random secret (see .env.example).");
    process.exit(1);
  }

  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    logger.warn("CONFIG", `JWT_SECRET is shorter than ${MIN_JWT_SECRET_LENGTH} characters. Use a longer random secret.`);
  }

  return secret;
}

export const JWT_SECRET = readJwtSecret();

// Database Configuration
export const DATABASE_URL = process.env.DATABASE_URL || "";

// Server Configuration
export const PORT = parseInt(process.env.PORT || "3000", 10);

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const rawValue = process.env[name];

  if (rawValue === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(rawValue.trim().toLowerCase());
}

// API docs are enabled by default in development and disabled by default in production.
export const ENABLE_API_DOCS = readBooleanEnv("ENABLE_API_DOCS", process.env.NODE_ENV !== "production");

// Uploads — configurable via UPLOADS_PATH env var (Docker mounts, custom paths)
const defaultUploads = path.join(__dirname, "../../data/uploads");
export const UPLOADS_PATH = process.env.UPLOADS_PATH || defaultUploads;
export const THUMBS_PATH = path.join(UPLOADS_PATH, "thumbs");

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
const DEFAULT_FRONTEND_URL = "http://localhost:5173";
export const FRONTEND_URL = process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL;

if (process.env.NODE_ENV === "production") {
  try {
    const frontendUrl = new URL(FRONTEND_URL);
    const usesLocalhost = ["localhost", "127.0.0.1", "::1"].includes(frontendUrl.hostname);

    if (!process.env.FRONTEND_URL || usesLocalhost) {
      logger.error("CONFIG", "FATAL: FRONTEND_URL is not set to a valid production URL.");
      process.exit(1);
    }
  } catch {
    logger.error("CONFIG", "FATAL: FRONTEND_URL is not a valid absolute URL.");
    process.exit(1);
  }
}

// CORS — explicit allowlist of browser origins. FRONTEND_URL is always allowed;
// extra origins can be added as a comma-separated CORS_ORIGINS list.
function toOrigin(value: string): string | null {
  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

export const CORS_ALLOWED_ORIGINS: string[] = Array.from(
  new Set(
    [FRONTEND_URL, ...(process.env.CORS_ORIGINS || "").split(",")]
      .filter((value) => value.trim())
      .map(toOrigin)
      .filter((origin): origin is string => origin !== null)
  )
);
