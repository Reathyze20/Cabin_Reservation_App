-- CreateTable
CREATE TABLE "thread_read_statuses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "thread_id" TEXT,
    "cabin_id" TEXT NOT NULL,
    "last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thread_read_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "thread_read_statuses_cabin_id_user_id_idx" ON "thread_read_statuses"("cabin_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "thread_read_statuses_user_id_thread_id_cabin_id_key" ON "thread_read_statuses"("user_id", "thread_id", "cabin_id");

-- AddForeignKey
ALTER TABLE "thread_read_statuses" ADD CONSTRAINT "thread_read_statuses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_read_statuses" ADD CONSTRAINT "thread_read_statuses_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "note_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_read_statuses" ADD CONSTRAINT "thread_read_statuses_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
