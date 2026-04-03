-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "checkout_completed_at" TIMESTAMP(3),
ADD COLUMN     "checkout_completed_by" TEXT,
ADD COLUMN     "is_checkout_completed" BOOLEAN NOT NULL DEFAULT false;
