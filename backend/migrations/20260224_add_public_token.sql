-- CONSOLIDATED FIX: Ensure all required columns exist in the incidents table
-- Run this in your Supabase SQL Editor

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS public_token TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS source TEXT;

-- Create index for faster access via public token
CREATE INDEX IF NOT EXISTS idx_incidents_public_token ON incidents(public_token);

-- NOTE: If you still see the error, click "Reload Schema Cache" in Supabase Settings 
-- or restart your backend server.
