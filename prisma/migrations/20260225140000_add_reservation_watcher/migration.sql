-- CreateTable: reservation_watchers
CREATE TABLE "reservation_watchers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservation_watchers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "reservation_watchers" ADD CONSTRAINT "reservation_watchers_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_watchers" ADD CONSTRAINT "reservation_watchers_reservation_id_fkey"
    FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UniqueConstraint
CREATE UNIQUE INDEX "reservation_watchers_user_id_reservation_id_key"
    ON "reservation_watchers"("user_id", "reservation_id");
