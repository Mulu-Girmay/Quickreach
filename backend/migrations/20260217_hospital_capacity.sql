-- Create hospitals table
CREATE TABLE IF NOT EXISTS hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 10,
  current_capacity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add enhancements to incidents table
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS session_id TEXT UNIQUE;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS is_collapsed BOOLEAN DEFAULT FALSE;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS parent_incident_id UUID REFERENCES incidents(id);

-- Insert some mock hospitals for Addis Ababa
INSERT INTO hospitals (name, lat, lng, max_capacity, current_capacity)
VALUES 
('Black Lion Hospital', 9.0197, 38.7469, 50, 45),
('St. Paul Hospital', 9.0528, 38.7306, 40, 10),
('Bole Medhanialem Hospital', 8.9950, 38.7850, 30, 5)
ON CONFLICT DO NOTHING;

-- PCR function to safely increment capacity
CREATE OR REPLACE FUNCTION increment_hospital_capacity(row_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE hospitals
  SET current_capacity = current_capacity + 1
  WHERE id = row_id AND current_capacity < max_capacity;
END;
$$ LANGUAGE plpgsql;

