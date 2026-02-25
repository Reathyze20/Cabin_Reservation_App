-- AlterTable: Add is_pantry column to shopping_lists
ALTER TABLE "shopping_lists" ADD COLUMN "is_pantry" BOOLEAN NOT NULL DEFAULT false;
