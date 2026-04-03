-- AlterTable (idempotent — columns may already exist from partial previous run)
ALTER TABLE "diary_folders" ADD COLUMN IF NOT EXISTS "cabin_id" TEXT;

-- AlterTable
ALTER TABLE "gallery_folders" ADD COLUMN IF NOT EXISTS "cabin_id" TEXT;

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "cabin_id" TEXT;

-- AlterTable
ALTER TABLE "note_threads" ADD COLUMN IF NOT EXISTS "cabin_id" TEXT;

-- AlterTable
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "cabin_id" TEXT;

-- AlterTable
ALTER TABLE "reconstruction_items" ADD COLUMN IF NOT EXISTS "cabin_id" TEXT;

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "cabin_id" TEXT;

-- AlterTable
ALTER TABLE "shopping_lists" ADD COLUMN IF NOT EXISTS "cabin_id" TEXT;

-- AlterTable
ALTER TABLE "user_availabilities" ADD COLUMN IF NOT EXISTS "cabin_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cabin_id" TEXT;
-- is_banned and is_super_admin already added in 20260227081211_add_super_admin_and_system_logs

-- CreateTable
CREATE TABLE IF NOT EXISTS "cabins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "features" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cabins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "cabins_subdomain_key" ON "cabins"("subdomain");

-- AddForeignKey (use DO block to avoid error if constraint already exists)
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "reservations" ADD CONSTRAINT "reservations_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "note_threads" ADD CONSTRAINT "note_threads_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "notes" ADD CONSTRAINT "notes_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gallery_folders" ADD CONSTRAINT "gallery_folders_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "diary_folders" ADD CONSTRAINT "diary_folders_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "reconstruction_items" ADD CONSTRAINT "reconstruction_items_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_availabilities" ADD CONSTRAINT "user_availabilities_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
