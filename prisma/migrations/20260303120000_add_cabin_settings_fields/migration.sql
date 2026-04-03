-- AlterTable: Add cabin settings / branding fields
ALTER TABLE "cabins" ADD COLUMN "description" TEXT;
ALTER TABLE "cabins" ADD COLUMN "welcome_message" VARCHAR(300);
ALTER TABLE "cabins" ADD COLUMN "address" VARCHAR(300);
ALTER TABLE "cabins" ADD COLUMN "rules" TEXT;
ALTER TABLE "cabins" ADD COLUMN "departure_checklist" JSONB;
ALTER TABLE "cabins" ADD COLUMN "cover_photo_url" TEXT;
