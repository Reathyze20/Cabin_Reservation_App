-- Performance indexes: frequently-queried columns that lacked indexes
-- Applied 2026-06-06

-- Reservations: cabin lookups + date range queries + status filter
CREATE INDEX IF NOT EXISTS "reservations_cabin_id_idx" ON "reservations"("cabin_id");
CREATE INDEX IF NOT EXISTS "reservations_cabin_date_range_idx" ON "reservations"("cabin_id", "date_from", "date_to");
CREATE INDEX IF NOT EXISTS "reservations_cabin_status_idx" ON "reservations"("cabin_id", "status");

-- Shopping lists: cabin + active list filter
CREATE INDEX IF NOT EXISTS "shopping_lists_cabin_resolved_idx" ON "shopping_lists"("cabin_id", "is_resolved");

-- Reconstruction items: cabin lookups + category filter
CREATE INDEX IF NOT EXISTS "reconstruction_items_cabin_id_idx" ON "reconstruction_items"("cabin_id");
CREATE INDEX IF NOT EXISTS "reconstruction_items_cabin_category_idx" ON "reconstruction_items"("cabin_id", "category");

-- Inventory items: cabin lookup + status filter
CREATE INDEX IF NOT EXISTS "inventory_items_cabin_id_idx" ON "inventory_items"("cabin_id");
CREATE INDEX IF NOT EXISTS "inventory_items_cabin_status_idx" ON "inventory_items"("cabin_id", "status");

-- User availabilities: cabin + date range queries
CREATE INDEX IF NOT EXISTS "user_availabilities_cabin_dates_idx" ON "user_availabilities"("cabin_id", "start_date", "end_date");

-- Diary folders: cabin lookup
CREATE INDEX IF NOT EXISTS "diary_folders_cabin_id_idx" ON "diary_folders"("cabin_id");

-- Diary entries: folder lookup
CREATE INDEX IF NOT EXISTS "diary_entries_folder_id_idx" ON "diary_entries"("folder_id");

-- Gallery folders: cabin lookup (unique index exists but plain index speeds WHERE queries)
CREATE INDEX IF NOT EXISTS "gallery_folders_cabin_id_idx" ON "gallery_folders"("cabin_id");

-- Gallery photos: folder lookup
CREATE INDEX IF NOT EXISTS "gallery_photos_folder_id_idx" ON "gallery_photos"("folder_id");
