-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "is_resolved_as_task" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "reconstruction_items" ADD COLUMN     "source_message_id" TEXT;

-- AlterTable
ALTER TABLE "shopping_list_items" ADD COLUMN     "source_message_id" TEXT;
