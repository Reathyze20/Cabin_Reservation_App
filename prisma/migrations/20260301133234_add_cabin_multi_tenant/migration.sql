-- AlterTable
ALTER TABLE "diary_folders" ADD COLUMN     "cabin_id" TEXT;

-- AlterTable
ALTER TABLE "gallery_folders" ADD COLUMN     "cabin_id" TEXT;

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "cabin_id" TEXT;

-- AlterTable
ALTER TABLE "note_threads" ADD COLUMN     "cabin_id" TEXT;

-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "cabin_id" TEXT;

-- AlterTable
ALTER TABLE "reconstruction_items" ADD COLUMN     "cabin_id" TEXT;

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "cabin_id" TEXT;

-- AlterTable
ALTER TABLE "shopping_lists" ADD COLUMN     "cabin_id" TEXT;

-- AlterTable
ALTER TABLE "user_availabilities" ADD COLUMN     "cabin_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "cabin_id" TEXT,
ADD COLUMN     "is_banned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_super_admin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "cabins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "features" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cabins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cabins_subdomain_key" ON "cabins"("subdomain");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_threads" ADD CONSTRAINT "note_threads_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_folders" ADD CONSTRAINT "gallery_folders_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diary_folders" ADD CONSTRAINT "diary_folders_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconstruction_items" ADD CONSTRAINT "reconstruction_items_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_availabilities" ADD CONSTRAINT "user_availabilities_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
