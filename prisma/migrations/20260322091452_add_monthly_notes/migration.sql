-- CreateTable
CREATE TABLE "monthly_notes" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" TEXT NOT NULL,
    "cabin_id" TEXT,

    CONSTRAINT "monthly_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "monthly_notes_cabin_id_year_month_key" ON "monthly_notes"("cabin_id", "year", "month");

-- AddForeignKey
ALTER TABLE "monthly_notes" ADD CONSTRAINT "monthly_notes_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_notes" ADD CONSTRAINT "monthly_notes_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
