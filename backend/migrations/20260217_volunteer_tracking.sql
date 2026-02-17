-- Create volunteers table
CREATE TABLE IF NOT EXISTS volunteers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_online BOOLEAN DEFAULT FALSE,
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Enable realtime for volunteers
ALTER PUBLICATION supabase_realtime ADD TABLE volunteers;

-- Disable RLS for demo
ALTER TABLE volunteers DISABLE ROW LEVEL SECURITY;

-- Insert some mock volunteers
INSERT INTO volunteers (name, phone, lat, lng, is_online)
VALUES 
('Dr. Abebe Bekele', '0911223344', 9.0200, 38.7500, false),
('Nurse Selam Tadesse', '0922334455', 9.0300, 38.7600, false),
('EMT Yohannes Haile', '0933445566', 9.0100, 38.7400, false)
ON CONFLICT (phone) DO NOTHING;
