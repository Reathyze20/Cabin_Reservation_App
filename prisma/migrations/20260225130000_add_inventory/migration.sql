-- CreateTable: inventory_items
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OSTATNÍ',
    "status" TEXT NOT NULL DEFAULT 'OK',
    "in_cart" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add linked_inventory_id to shopping_list_items
ALTER TABLE "shopping_list_items" ADD COLUMN "linked_inventory_id" TEXT;
