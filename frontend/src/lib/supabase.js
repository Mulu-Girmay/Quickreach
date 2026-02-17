import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl?.trim()) {
  throw new Error("supabaseUrl is required.");
}

if (!supabaseAnonKey?.trim()) {
  throw new Error("supabaseAnonKey is required.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
