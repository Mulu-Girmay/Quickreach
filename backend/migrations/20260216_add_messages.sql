-- Create table for emergency messages
CREATE TABLE incident_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('citizen', 'dispatcher')),
  message TEXT NOT NULL
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE incident_messages;

-- Disable RLS for testing compatibility
ALTER TABLE incident_messages DISABLE ROW LEVEL SECURITY;
