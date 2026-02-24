-- Add notified_dispatched column to track if a dispatch SMS has been sent
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS notified_dispatched BOOLEAN DEFAULT false;
