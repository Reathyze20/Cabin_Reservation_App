-- Add missing enum value 'bring_from_home' to ItemStatus if not already present
DO $$ BEGIN
  ALTER TYPE "ItemStatus" ADD VALUE IF NOT EXISTS 'bring_from_home';
EXCEPTION WHEN others THEN NULL;
END $$;
