-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "pinned_handover_note" TEXT,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);
