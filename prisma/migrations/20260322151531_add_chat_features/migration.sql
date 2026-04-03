-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "edited_at" TIMESTAMP(3),
ADD COLUMN     "is_pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reply_to_id" TEXT;

-- CreateTable
CREATE TABLE "note_reactions" (
    "id" TEXT NOT NULL,
    "note_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "emoji" VARCHAR(8) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "note_reactions_note_id_idx" ON "note_reactions"("note_id");

-- CreateIndex
CREATE UNIQUE INDEX "note_reactions_note_id_user_id_emoji_key" ON "note_reactions"("note_id", "user_id", "emoji");

-- CreateIndex
CREATE INDEX "notes_cabin_id_thread_id_is_pinned_idx" ON "notes"("cabin_id", "thread_id", "is_pinned");

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_reactions" ADD CONSTRAINT "note_reactions_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_reactions" ADD CONSTRAINT "note_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
