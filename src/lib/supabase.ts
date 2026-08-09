import { createClient } from '@supabase/supabase-js';

// The anon key is safe to ship to the browser -- it only grants what your
// Supabase Row Level Security policies allow. Never put the service_role key
// behind a VITE_ prefix; that would bundle it into client-side JS for anyone
// to read. Server-only code (the /api functions) reads the service key
// straight from process.env instead.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY -- copy .env.example to .env.local and fill them in.');
}

export const supabase = createClient(url, anonKey);
