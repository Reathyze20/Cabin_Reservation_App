-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "thread_id" TEXT;

-- CreateTable
CREATE TABLE "note_threads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_threads_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "note_threads" ADD CONSTRAINT "note_threads_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "note_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
