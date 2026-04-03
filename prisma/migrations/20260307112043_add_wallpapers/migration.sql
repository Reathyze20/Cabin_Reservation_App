-- CreateTable
CREATE TABLE "wallpapers" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "cabin_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallpapers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "wallpapers" ADD CONSTRAINT "wallpapers_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
