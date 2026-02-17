const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl?.trim()) {
  throw new Error("SUPABASE_URL is required.");
}

if (!supabaseKey?.trim()) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required.");
}

// Using service role key for backend to bypass RLS where necessary (e.g., for USSD system)
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
