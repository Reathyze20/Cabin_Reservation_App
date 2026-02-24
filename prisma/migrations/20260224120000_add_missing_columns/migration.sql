-- ============================================================================
-- Catch-up migration: add all columns present in schema but missing in DB
-- ============================================================================

-- Create ItemStatus enum for shopping_list_items
DO $$ BEGIN
  CREATE TYPE "ItemStatus" AS ENUM ('pending', 'purchased');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── users ────────────────────────────────────────────────────────────────────
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "animal_icon"        TEXT,
  ADD COLUMN IF NOT EXISTS "email"              TEXT,
  ADD COLUMN IF NOT EXISTS "is_email_verified"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "verification_code"  TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- ── reservations ─────────────────────────────────────────────────────────────
ALTER TABLE "reservations"
  ADD COLUMN IF NOT EXISTS "handover_note" TEXT;

-- ── shopping_list_items ───────────────────────────────────────────────────────
ALTER TABLE "shopping_list_items"
  ADD COLUMN IF NOT EXISTS "status" "ItemStatus" NOT NULL DEFAULT 'pending';

-- ── reconstruction_items ──────────────────────────────────────────────────────
ALTER TABLE "reconstruction_items"
  ADD COLUMN IF NOT EXISTS "thumbnail"       TEXT,
  ADD COLUMN IF NOT EXISTS "tag"             TEXT,
  ADD COLUMN IF NOT EXISTS "specialization"  TEXT,
  ADD COLUMN IF NOT EXISTS "email"           TEXT,
  ADD COLUMN IF NOT EXISTS "phone"           TEXT,
  ADD COLUMN IF NOT EXISTS "deadline"        DATE;

-- ── diary_folders ─────────────────────────────────────────────────────────────
ALTER TABLE "diary_folders"
  ADD COLUMN IF NOT EXISTS "activity_tag" TEXT;
