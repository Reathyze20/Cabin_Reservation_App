/*
  Warnings:

  - A unique constraint covering the columns `[name,cabin_id]` on the table `gallery_folders` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "gallery_folders_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "gallery_folders_name_cabin_id_key" ON "gallery_folders"("name", "cabin_id");
