-- 1. Ensure extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Hospitals Table
CREATE TABLE IF NOT EXISTS hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  max_capacity INTEGER DEFAULT 10,
  current_capacity INTEGER DEFAULT 0
);

INSERT INTO hospitals (name, lat, lng, max_capacity, current_capacity)
VALUES 
('Black Lion Hospital', 9.0182, 38.7475, 50, 12),
('Saint Paul Hospital', 9.0492, 38.7119, 40, 5),
('Zewditu Hospital', 9.0195, 38.7525, 30, 8)
ON CONFLICT DO NOTHING;

-- 3. Volunteers Table
CREATE TABLE IF NOT EXISTS volunteers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_online BOOLEAN DEFAULT FALSE,
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enhance Incidents Table
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='incidents' AND column_name='triage_score') THEN
    ALTER TABLE incidents ADD COLUMN triage_score INTEGER DEFAULT 5;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='incidents' AND column_name='parent_incident_id') THEN
    ALTER TABLE incidents ADD COLUMN parent_incident_id UUID REFERENCES incidents(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='incidents' AND column_name='session_id') THEN
    ALTER TABLE incidents ADD COLUMN session_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='incidents' AND column_name='hospital_id') THEN
    ALTER TABLE incidents ADD COLUMN hospital_id UUID REFERENCES hospitals(id);
  END IF;
END $$;

-- 5. RPC function for capacity
CREATE OR REPLACE FUNCTION increment_hospital_capacity(h_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE hospitals 
  SET current_capacity = LEAST(max_capacity, current_capacity + 1)
  WHERE id = h_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Enable Realtime safely
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'hospitals') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE hospitals;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'volunteers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE volunteers;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'incidents') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
  END IF;
END $$;

-- 7. Disable RLS for demo environment
ALTER TABLE hospitals DISABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers DISABLE ROW LEVEL SECURITY;
ALTER TABLE incidents DISABLE ROW LEVEL SECURITY;
