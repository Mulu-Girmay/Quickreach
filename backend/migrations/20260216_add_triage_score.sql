-- Add triage_score column to incidents table if it doesn't exist
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS triage_score INTEGER DEFAULT 5;

-- Ensure status has a default
ALTER TABLE incidents ALTER COLUMN status SET DEFAULT 'Pending';

-- Ensure reporter_phone exists
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS reporter_phone TEXT;
