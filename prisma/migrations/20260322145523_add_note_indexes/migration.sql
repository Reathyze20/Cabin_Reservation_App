-- CreateIndex
CREATE INDEX "note_threads_cabin_id_idx" ON "note_threads"("cabin_id");

-- CreateIndex
CREATE INDEX "notes_cabin_id_thread_id_idx" ON "notes"("cabin_id", "thread_id");

-- CreateIndex
CREATE INDEX "notes_cabin_id_thread_id_created_at_idx" ON "notes"("cabin_id", "thread_id", "created_at");
